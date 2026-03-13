import React, { useState, useEffect, useCallback } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, CalendarIcon, Clock, BookOpen, ChevronRight,
  Send, Camera, X, Lock, Image as ImageIcon, Loader2
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function LessonsPage() {
  const { token, isInstructor, user } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonFeedback, setLessonFeedback] = useState([]);

  // Create form state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(null);
  const [time, setTime] = useState("");
  const [level, setLevel] = useState("");
  const [topicsText, setTopicsText] = useState("");
  const [creating, setCreating] = useState(false);

  // Feedback form state
  const [feedbackText, setFeedbackText] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchLessons = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/lessons`, { headers });
      setLessons(data);
    } catch {
      toast.error("Errore nel caricamento lezioni");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const fetchFeedback = async (lessonId) => {
    try {
      const { data } = await axios.get(`${API}/feedback?lesson_id=${lessonId}`, { headers });
      setLessonFeedback(data);
    } catch {}
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    if (!title || !date || !time || !level) {
      toast.error("Compila tutti i campi");
      return;
    }
    const topics = topicsText.split("\n").map(t => t.trim()).filter(Boolean);
    if (topics.length === 0) {
      toast.error("Inserisci almeno un argomento");
      return;
    }
    setCreating(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      await axios.post(`${API}/lessons`, { title, date: dateStr, time, topics, level }, { headers });
      toast.success("Lezione creata e notifiche inviate!");
      setCreateOpen(false);
      resetCreateForm();
      fetchLessons();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Errore nella creazione");
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setTitle("");
    setDate(null);
    setTime("");
    setLevel("");
    setTopicsText("");
  };

  const openLessonDetail = (lesson) => {
    setSelectedLesson(lesson);
    setDetailOpen(true);
    fetchFeedback(lesson.id);
    setFeedbackText("");
    setIsPrivate(false);
    setPhotos([]);
  };

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 5) {
      toast.error("Massimo 5 foto per feedback");
      return;
    }
    setUploading(true);
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const { data } = await axios.post(`${API}/upload`, formData, {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
        });
        setPhotos((prev) => [...prev, data.url]);
      } catch {
        toast.error(`Errore upload: ${file.name}`);
      }
    }
    setUploading(false);
    e.target.value = "";
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      toast.error("Scrivi il tuo feedback");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/feedback`,
        {
          lesson_id: selectedLesson.id,
          text: feedbackText,
          photos,
          is_private: isPrivate,
        },
        { headers }
      );
      toast.success("Feedback inviato!");
      setFeedbackText("");
      setIsPrivate(false);
      setPhotos([]);
      fetchFeedback(selectedLesson.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Errore nell'invio");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    try {
      return format(new Date(dateStr + "T00:00:00"), "dd MMMM yyyy", { locale: it });
    } catch {
      return dateStr;
    }
  };

  const getLevelColor = (lvl) => {
    const colors = {
      Principiante: "bg-green-500/20 text-green-400 border-green-500/30",
      Intermedio: "bg-[#F5A623]/20 text-[#F5A623] border-[#F5A623]/30",
      Avanzato: "bg-red-500/20 text-red-400 border-red-500/30",
      "Tutti i livelli": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    };
    return colors[lvl] || "bg-white/10 text-white/60 border-white/20";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#F5A623] animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="lessons-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="text-2xl md:text-3xl font-bold tracking-wider text-white uppercase"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            Lezioni
          </h2>
          <p className="text-white/40 text-sm mt-1">{lessons.length} lezioni in programma</p>
        </div>
        {isInstructor && (
          <button
            onClick={() => setCreateOpen(true)}
            className="bg-[#F5A623] text-black hover:bg-[#E0961F] font-bold uppercase tracking-wider rounded-sm px-5 py-2.5 text-sm transition-all active:scale-95 flex items-center gap-2"
            data-testid="create-lesson-button"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuova Lezione</span>
          </button>
        )}
      </div>

      {/* Lessons List */}
      {lessons.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg">Nessuna lezione ancora</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson, i) => (
            <div
              key={lesson.id}
              onClick={() => openLessonDetail(lesson)}
              className={`lesson-card relative overflow-hidden bg-[#121212] border-l-4 border-[#F5A623] p-4 md:p-5 rounded-r-md cursor-pointer group animate-slide-up stagger-${Math.min(i + 1, 5)}`}
              style={{ opacity: 0 }}
              data-testid={`lesson-card-${lesson.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-semibold text-lg truncate">{lesson.title}</h3>
                    <Badge className={`shrink-0 text-[10px] border ${getLevelColor(lesson.level)}`}>
                      {lesson.level}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-white/40 text-sm mb-3">
                    <span className="flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {formatDate(lesson.date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {lesson.time}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lesson.topics.map((topic, j) => (
                      <span key={j} className="text-xs bg-white/5 text-white/60 px-2 py-0.5 rounded">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-[#F5A623] transition-colors shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Lesson Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#121212] border-white/10 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-white text-xl tracking-wider uppercase"
              style={{ fontFamily: "Barlow Condensed, sans-serif" }}
            >
              Nuova Lezione
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Crea una lezione e invia notifiche a tutti gli allievi
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateLesson} className="space-y-4 mt-2" data-testid="create-lesson-form">
            <div className="space-y-2">
              <Label className="text-white/70 text-xs tracking-wider uppercase">Titolo</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es: Kata Avanzato"
                className="bg-[#0A0A0A] border-white/20 focus:border-[#F5A623] text-white h-10 rounded-sm placeholder:text-white/30"
                data-testid="lesson-title-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-white/70 text-xs tracking-wider uppercase">Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 bg-[#0A0A0A] border border-white/20 hover:border-white/40 text-left h-10 px-3 rounded-sm text-sm transition-colors"
                      data-testid="lesson-date-picker"
                    >
                      <CalendarIcon className="w-4 h-4 text-white/40" />
                      <span className={date ? "text-white" : "text-white/30"}>
                        {date ? format(date, "dd/MM/yyyy") : "Seleziona"}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#121212] border-white/10" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      data-testid="lesson-calendar"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-white/70 text-xs tracking-wider uppercase">Ora</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-[#0A0A0A] border-white/20 focus:border-[#F5A623] text-white h-10 rounded-sm [color-scheme:dark]"
                  data-testid="lesson-time-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70 text-xs tracking-wider uppercase">Livello</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger
                  className="bg-[#0A0A0A] border-white/20 text-white h-10 rounded-sm"
                  data-testid="lesson-level-select"
                >
                  <SelectValue placeholder="Seleziona livello" />
                </SelectTrigger>
                <SelectContent className="bg-[#121212] border-white/10">
                  <SelectItem value="Principiante">Principiante</SelectItem>
                  <SelectItem value="Intermedio">Intermedio</SelectItem>
                  <SelectItem value="Avanzato">Avanzato</SelectItem>
                  <SelectItem value="Tutti i livelli">Tutti i livelli</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70 text-xs tracking-wider uppercase">
                Argomenti (uno per riga)
              </Label>
              <Textarea
                value={topicsText}
                onChange={(e) => setTopicsText(e.target.value)}
                placeholder={"Riscaldamento\nKata Heian Shodan\nCombattimento libero"}
                className="bg-[#0A0A0A] border-white/20 focus:border-[#F5A623] text-white rounded-sm min-h-[80px] placeholder:text-white/30"
                data-testid="lesson-topics-input"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full bg-[#F5A623] text-black hover:bg-[#E0961F] font-bold uppercase tracking-wider rounded-sm px-6 py-3 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="lesson-submit-button"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Crea e Invia Notifiche
                </>
              )}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lesson Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-[#121212] border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedLesson && (
            <>
              <DialogHeader>
                <DialogTitle
                  className="text-white text-xl tracking-wider uppercase"
                  style={{ fontFamily: "Barlow Condensed, sans-serif" }}
                >
                  {selectedLesson.title}
                </DialogTitle>
                <DialogDescription className="text-white/40">
                  Dettagli lezione e feedback
                </DialogDescription>
              </DialogHeader>

              {/* Lesson Info */}
              <div className="border-l-4 border-[#F5A623] pl-4 py-2 space-y-2" data-testid="lesson-detail-info">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-white/60">
                    <CalendarIcon className="w-4 h-4 text-[#F5A623]" />
                    {formatDate(selectedLesson.date)}
                  </span>
                  <span className="flex items-center gap-1.5 text-white/60">
                    <Clock className="w-4 h-4 text-[#F5A623]" />
                    {selectedLesson.time}
                  </span>
                </div>
                <Badge className={`text-xs border ${getLevelColor(selectedLesson.level)}`}>
                  {selectedLesson.level}
                </Badge>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedLesson.topics.map((topic, j) => (
                    <span key={j} className="text-xs bg-white/5 text-white/70 px-2.5 py-1 rounded">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Feedback Form (for students) */}
              {user?.role === "student" && (
                <div className="mt-4 p-4 bg-[#0A0A0A] rounded-md border border-white/10" data-testid="feedback-form">
                  <h4
                    className="text-white font-semibold text-sm tracking-wider uppercase mb-3"
                    style={{ fontFamily: "Barlow Condensed, sans-serif" }}
                  >
                    Invia Feedback
                  </h4>
                  <Textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Scrivi il tuo feedback sulla lezione..."
                    className="bg-[#121212] border-white/20 focus:border-[#F5A623] text-white rounded-sm min-h-[80px] placeholder:text-white/30 mb-3"
                    data-testid="feedback-text-input"
                  />

                  {/* Photos */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <label
                        className="flex items-center gap-2 text-sm text-white/60 hover:text-[#F5A623] cursor-pointer transition-colors"
                        data-testid="feedback-photo-upload"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Aggiungi foto ({photos.length}/5)</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handlePhotoSelect}
                          disabled={photos.length >= 5 || uploading}
                        />
                      </label>
                      {uploading && <Loader2 className="w-4 h-4 text-[#F5A623] animate-spin" />}
                    </div>
                    {photos.length > 0 && (
                      <div className="photo-grid">
                        {photos.map((photo, i) => (
                          <div key={i} className="relative aspect-square rounded overflow-hidden group">
                            <img
                              src={`${BACKEND_URL}${photo}`}
                              alt={`Foto ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => removePhoto(i)}
                              className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              data-testid={`remove-photo-${i}`}
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Private toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Lock className="w-4 h-4 text-[#F5A623]" />
                      <span className="text-white/60">Feedback privato (solo istruttori)</span>
                    </div>
                    <Switch
                      checked={isPrivate}
                      onCheckedChange={setIsPrivate}
                      className="data-[state=checked]:bg-[#F5A623]"
                      data-testid="feedback-private-switch"
                    />
                  </div>

                  <button
                    onClick={handleSubmitFeedback}
                    disabled={submitting || !feedbackText.trim()}
                    className="w-full bg-[#F5A623] text-black hover:bg-[#E0961F] font-bold uppercase tracking-wider rounded-sm px-4 py-2.5 text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="feedback-submit-button"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Invia Feedback
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Feedback List */}
              <div className="mt-4" data-testid="lesson-feedback-list">
                <h4
                  className="text-white font-semibold text-sm tracking-wider uppercase mb-3"
                  style={{ fontFamily: "Barlow Condensed, sans-serif" }}
                >
                  Feedback ({lessonFeedback.length})
                </h4>
                {lessonFeedback.length === 0 ? (
                  <p className="text-white/30 text-sm text-center py-4">Nessun feedback per questa lezione</p>
                ) : (
                  <div className="space-y-3">
                    {lessonFeedback.map((fb) => (
                      <div
                        key={fb.id}
                        className={`bg-[#0A0A0A] border rounded-md p-3 ${
                          fb.is_private ? "border-[#F5A623]/30" : "border-white/10"
                        }`}
                        data-testid={`feedback-item-${fb.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#F5A623]/20 flex items-center justify-center text-[#F5A623] text-xs font-bold">
                              {fb.student_name?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="text-white text-sm font-medium">{fb.student_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {fb.is_private && (
                              <span className="flex items-center gap-1 text-[#F5A623] text-xs">
                                <Lock className="w-3 h-3" />
                                Privato
                              </span>
                            )}
                            <span className="text-white/30 text-xs">
                              {new Date(fb.created_at).toLocaleDateString("it-IT")}
                            </span>
                          </div>
                        </div>
                        <p className="text-white/80 text-sm leading-relaxed">{fb.text}</p>
                        {fb.photos && fb.photos.length > 0 && (
                          <div className="photo-grid mt-2">
                            {fb.photos.map((photo, j) => (
                              <img
                                key={j}
                                src={`${BACKEND_URL}${photo}`}
                                alt={`Foto ${j + 1}`}
                                className="aspect-square object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(`${BACKEND_URL}${photo}`, "_blank")}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
