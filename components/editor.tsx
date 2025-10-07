"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Note } from "@/components/main-app"
import { useDebounce } from "@/hooks/useDebounce"
import { Copy, ExternalLink, ShieldCheck, Lock, CheckCircle2, AlertCircle, Loader2, Check, Save, Trash2, Upload, FileText } from "lucide-react"

interface EditorProps {
  note: Note | null
  onUpdateNote: (note: Note) => void
  onPublishNote: (note: Note) => void
  onPublishHighlight: (note: Note, highlightedText: string) => void
  onDeleteNote: (note: Note) => void
  authData: any // AuthData type
}

export default function Editor({ note, onUpdateNote, onPublishNote, onPublishHighlight, onDeleteNote, authData }: EditorProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [newTag, setNewTag] = useState("")
  const [selectedText, setSelectedText] = useState("")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [findingEventId, setFindingEventId] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const currentNoteIdRef = useRef<string | null>(null)
  const previousNoteDataRef = useRef<{ id: string; title: string; content: string } | null>(null)

  const debouncedTitle = useDebounce(title, 1500)
  const debouncedContent = useDebounce(content, 1500)

  useEffect(() => {
    if (note && note.id !== currentNoteIdRef.current) {
      // Save previous note if there were unsaved changes
      if (previousNoteDataRef.current && hasUnsavedChanges) {
        console.log("[v0] Saving previous note before switching:", previousNoteDataRef.current.id)
        const noteToSave = {
          ...note,
          id: previousNoteDataRef.current.id,
          title: previousNoteDataRef.current.title,
          content: previousNoteDataRef.current.content,
        } as Note
        onUpdateNote(noteToSave)
      }

      console.log("[v0] Switching to note:", note.id)
      setTitle(note.title)
      setContent(note.content)
      setHasUnsavedChanges(false)
      currentNoteIdRef.current = note.id
      previousNoteDataRef.current = { id: note.id, title: note.title, content: note.content }
    }
  }, [note])

  useEffect(() => {
    if (note && (debouncedTitle !== note.title || debouncedContent !== note.content)) {
      // Only save if there's actual content (not just empty note)
      if (debouncedTitle.trim() || debouncedContent.trim()) {
        // Check if content actually changed (not just formatting/whitespace)
        const titleChanged = debouncedTitle.trim() !== note.title.trim()
        const contentChanged = debouncedContent.trim() !== note.content.trim()
        
        if (titleChanged || contentChanged) {
          console.log("[v0] Auto-saving note after 1.5s delay...")
          const updatedNote = { ...note, title: debouncedTitle, content: debouncedContent }
          onUpdateNote(updatedNote)
          setHasUnsavedChanges(false)
          previousNoteDataRef.current = { id: note.id, title: debouncedTitle, content: debouncedContent }
          console.log("[v0] Auto-save completed")
        } else {
          console.log("[v0] Only whitespace changed, skipping auto-save")
          setHasUnsavedChanges(false)
          // Update the ref to prevent re-triggering
          previousNoteDataRef.current = { id: note.id, title: debouncedTitle, content: debouncedContent }
        }
      }
    }
  }, [debouncedTitle, debouncedContent])

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    setHasUnsavedChanges(true)
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    setHasUnsavedChanges(true)
  }

  const handleSave = async () => {
    if (note && hasUnsavedChanges) {
      console.log("[v0] Manual save triggered...")

      const updatedNote = { ...note, title, content }
      onUpdateNote(updatedNote)
      setHasUnsavedChanges(false)
      // Update previous note data ref
      previousNoteDataRef.current = { id: note.id, title, content }
      console.log("[v0] Note saved immediately")
    }
  }

  const copyEventId = async (eventId: string) => {
    try {
      await navigator.clipboard.writeText(eventId)
      setCopiedId(eventId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy event ID:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = eventId
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
      setCopiedId(eventId)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && note && !note.tags.includes(newTag.trim())) {
      const updatedNote = { ...note, tags: [...note.tags, newTag.trim()] }
      onUpdateNote(updatedNote)
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    if (note) {
      const updatedNote = { ...note, tags: note.tags.filter((tag) => tag !== tagToRemove) }
      onUpdateNote(updatedNote)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTag()
    }
  }

  const handleTextSelection = () => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    if (start !== end) {
      const selected = textarea.value.substring(start, end).trim()
      console.log("[v0] Text selection detected:", selected.length > 0 ? `"${selected.substring(0, 50)}..."` : "none")
      setSelectedText(selected)
    } else {
      console.log("[v0] No text selection")
      setSelectedText("")
    }
  }

  const handleDeleteClick = () => {
    console.log("[v0] Delete button clicked for note:", note?.id)
    if (note) {
      console.log("[v0] Calling onDeleteNote for modal")
      onDeleteNote(note)
    }
  }

  const handlePublishClick = () => {
    if (!note) return

    if (selectedText && selectedText.length > 0) {
      console.log("[v0] Publishing highlight:", selectedText.substring(0, 50) + "...")
      onPublishHighlight(note, selectedText)
    } else {
      console.log("[v0] Publishing full note")
      onPublishNote(note)
    }
  }

  const getPublishButtonText = () => {
    if (selectedText && selectedText.length > 0) {
      return "Publish Highlight to Nostr"
    }
    return "Publish to Nostr"
  }

  if (!note) {
    return (
      <div className="flex-1 bg-background flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="w-16 h-16 text-muted-foreground mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-16 h-16" />
          </div>
          <p className="text-muted-foreground">Select a note to view or create a new one to start writing.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white dark:bg-background flex flex-col w-full h-full">
      {/* Clean Header */}
      <div className="border-b border-border px-8 py-6">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title..."
          className="w-full bg-transparent border-none outline-none text-3xl font-bold placeholder:text-muted-foreground focus:outline-none mb-6"
        />

        <div className="flex items-center gap-2">
          {/* Desktop buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              variant="outline"
              size="sm"
              className={
                hasUnsavedChanges
                  ? "border-primary text-primary hover:bg-primary/10"
                  : "border-border text-muted-foreground opacity-50"
              }
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>

            <Button
              onClick={handleDeleteClick}
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>

            <Button
              onClick={handlePublishClick}
              disabled={!content.trim()}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {getPublishButtonText()}
            </Button>
          </div>

          {/* Mobile buttons */}
          <div className="sm:hidden flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              size="sm"
              className={
                hasUnsavedChanges
                  ? "bg-primary hover:bg-primary/90 text-white text-xs px-2 no-select"
                  : "bg-muted opacity-50 text-xs px-2 no-select"
              }
            >
              <Save className="w-4 h-4" />
            </Button>
            <Button
              onClick={handlePublishClick}
              disabled={!content.trim()}
              size="sm"
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-xs px-2 no-select"
            >
              <Upload className="w-4 h-4" />
              {selectedText ? "Highlight" : "Publish"}
            </Button>
            <Button
              onClick={handleDeleteClick}
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 text-xs px-2 no-select"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Clean Editor */}
      <div className="flex-1 px-8 py-6">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onSelect={handleTextSelection}
          onMouseUp={handleTextSelection}
          onKeyUp={handleTextSelection}
          onFocus={handleTextSelection}
          placeholder="Start writing..."
          className="w-full h-full bg-transparent border-none text-foreground placeholder-muted-foreground resize-none text-base leading-relaxed focus:outline-none"
        />
      </div>

      {/* Clean Footer - Tags and Sync Status */}
      <div className="border-t border-border px-8 py-4 bg-secondary/30">
        <div className="flex flex-wrap gap-2 mb-3">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm border border-primary/20"
            >
              #{tag}
              <button onClick={() => handleRemoveTag(tag)} className="text-primary/70 hover:text-primary">
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2 mb-3">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add a tag..."
            className="flex-1"
          />
          <Button
            onClick={handleAddTag}
            disabled={!newTag.trim()}
            variant="outline"
            className="border-border"
          >
            Add
          </Button>
        </div>

        <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <span className="mono">
            Created: {note.createdAt.toLocaleDateString()} {note.createdAt.toLocaleTimeString()}
          </span>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && <span className="text-primary text-xs">● Auto-saving...</span>}
            <span>
              {note.lastSynced ? (
                <span className="status-synced">
                  Synced: {note.lastSynced.toLocaleDateString()} {note.lastSynced.toLocaleTimeString()}
                </span>
              ) : (
                <span className="status-local">Not synced</span>
              )}
            </span>
          </div>
        </div>

        {/* Verification Section */}
        <div className="border-t border-border pt-3 mt-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              {/* Encryption indicator */}
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Lock className="w-3 h-3" />
                <span>Encrypted</span>
              </div>
              
              {/* Sync status */}
              {note.syncStatus === 'synced' && note.eventId && (
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>On Nostr</span>
                </div>
              )}
              
              {note.syncStatus === 'synced' && !note.eventId && (
                <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="w-3 h-3" />
                  <span>Synced (no event ID)</span>
                </div>
              )}
              
              {note.syncStatus === 'local' && (
                <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="w-3 h-3" />
                  <span>Local only</span>
                </div>
              )}
              
              {note.syncStatus === 'syncing' && (
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Syncing...</span>
                </div>
              )}
            </div>
            
            {/* Event ID with actions - Show for notes WITH eventId */}
            {note.eventId && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Event ID:</span>
                <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  {note.eventId.slice(0, 8)}...
                </code>
                
                <Button
                  onClick={() => copyEventId(note.eventId!)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  title="Copy Full Event ID"
                >
                  {copiedId === note.eventId ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
                
                {/* Primary verify button - njump shows all event kinds */}
                <Button
                  onClick={() => window.open(`https://njump.me/${note.eventId}`, '_blank')}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  title="Verify on Nostr (njump gateway)"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            )}
            
            {/* Find on Nostr button - Show for synced notes WITHOUT eventId */}
            {!note.eventId && note.syncStatus === 'synced' && (
              <Button
                onClick={async () => {
                  console.log('[Editor] 🔍 Finding note on Nostr...')
                  setFindingEventId(true)
                  
                  try {
                    // Import the fetch function
                    const { fetchAllNotesFromNostr } = await import('@/lib/nostr-storage')
                    
                    // Fetch all notes from Nostr
                    console.log('[Editor] Fetching all notes from relays...')
                    const remoteNotes = await fetchAllNotesFromNostr(authData)
                    console.log('[Editor] Found', remoteNotes.length, 'notes on Nostr')
                    
                    // Find this specific note by ID
                    const remoteNote = remoteNotes.find(n => n.id === note.id)
                    
                    if (remoteNote && remoteNote.eventId) {
                      console.log('[Editor] ✅ Found event ID:', remoteNote.eventId)
                      
                      // Update the note with the eventId
                      onUpdateNote({
                        ...note,
                        eventId: remoteNote.eventId,
                        eventKind: remoteNote.eventKind
                      })
                      
                      console.log('[Editor] ✅ Note updated with eventId:', remoteNote.eventId)
                    } else {
                      console.log('[Editor] ❌ Note not found on Nostr')
                      alert('Note not found on Nostr network.\n\nThis note may not have synced yet, or may only exist locally.')
                    }
                  } catch (error) {
                    console.error('[Editor] ❌ Error finding note:', error)
                    alert('Failed to search Nostr:\n\n' + (error instanceof Error ? error.message : 'Unknown error'))
                  } finally {
                    setFindingEventId(false)
                  }
                }}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500"
                disabled={findingEventId}
                title="Search for this note on Nostr relays to retrieve event ID"
              >
                {findingEventId ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    🔍 Find on Nostr
                  </>
                )}
              </Button>
            )}
            
            {!note.eventId && note.syncStatus === 'local' && (
              <span className="text-xs text-muted-foreground">
                Not yet synced to Nostr
              </span>
            )}
            
            {!note.eventId && !note.syncStatus && (
              <span className="text-xs text-muted-foreground">
                Not synced
              </span>
            )}
          </div>
        </div>

        {selectedText && (
          <div className="text-xs text-primary mt-2">
            Selected: "{selectedText.substring(0, 100)}
            {selectedText.length > 100 ? "..." : ""}"
          </div>
        )}
      </div>
    </div>
  )
}