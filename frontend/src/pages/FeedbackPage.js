import React, { useState, useEffect, useCallback } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Lock, MessageSquare, Image as ImageIcon, Loader2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function FeedbackPage() {
  const { token, isInstructor } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/feedback`;
      if (selectedDate) {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        url += `?date=${dateStr}`;
      }
      const { data } = await axios.get(url, { headers });
      setFeedback(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token, selectedDate]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setDatePickerOpen(false);
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
  };

  const formatDate = (dateStr) => {
    try {
      return format(new Date(dateStr + "T00:00:00"), "dd MMMM yyyy", { locale: it });
    } catch {
      return dateStr;
    }
  };

  // Group feedback by lesson
  const groupedFeedback = feedback.reduce((acc, fb) => {
    const key = fb.lesson_id;
    if (!acc[key]) {
      acc[key] = {
        lesson_title: fb.lesson_title || "Lezione",
        lesson_date: fb.lesson_date || "",
        items: [],
      };
    }
    acc[key].items.push(fb);
    return acc;
  }, {});

  return (
    <div data-testid="feedback-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="text-2xl md:text-3xl font-bold tracking-wider text-white uppercase"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            Archivio Feedback
          </h2>
          <p className="text-white/40 text-sm mt-1">
            {selectedDate
              ? `Feedback del ${format(selectedDate, "dd MMMM yyyy", { locale: it })}`
              : "Tutti i feedback"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedDate && (
            <button
              onClick={clearDateFilter}
              className="text-white/40 hover:text-white text-xs border border-white/20 rounded-sm px-3 py-1.5 transition-colors"
              data-testid="clear-date-filter"
            >
              Cancella filtro
            </button>
          )}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <button
                className="bg-white/10 text-white hover:bg-white/20 font-semibold uppercase tracking-wider rounded-sm px-4 py-2.5 text-sm backdrop-blur-sm flex items-center gap-2 transition-colors"
                data-testid="feedback-date-picker-button"
              >
                <CalendarIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Filtra per data</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#121212] border-white/10" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                data-testid="feedback-calendar"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#F5A623] animate-spin" />
        </div>
      ) : feedback.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg">Nessun feedback trovato</p>
          {selectedDate && (
            <p className="text-sm mt-2">Prova a selezionare un'altra data</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFeedback).map(([lessonId, group]) => (
            <div
              key={lessonId}
              className="animate-fade-in"
              data-testid={`feedback-group-${lessonId}`}
            >
              {/* Lesson header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-8 bg-[#F5A623] rounded-full" />
                <div>
                  <h3 className="text-white font-semibold text-lg">{group.lesson_title}</h3>
                  {group.lesson_date && (
                    <p className="text-white/40 text-xs">{formatDate(group.lesson_date)}</p>
                  )}
                </div>
                <Badge className="bg-white/10 text-white/60 border-white/20 text-xs">
                  {group.items.length} feedback
                </Badge>
              </div>

              {/* Feedback items */}
              <div className="space-y-3 ml-4">
                {group.items.map((fb) => (
                  <div
                    key={fb.id}
                    className={`bg-[#121212] border rounded-md p-4 transition-colors hover:bg-[#1A1A1A] ${
                      fb.is_private ? "border-[#F5A623]/30" : "border-white/5"
                    }`}
                    data-testid={`feedback-card-${fb.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#F5A623]/20 flex items-center justify-center text-[#F5A623] text-xs font-bold">
                          {fb.student_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="text-white font-medium text-sm">{fb.student_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {fb.is_private && (
                          <span className="flex items-center gap-1 text-[#F5A623] text-xs font-medium">
                            <Lock className="w-3 h-3" />
                            Privato
                          </span>
                        )}
                        <span className="text-white/30 text-xs">
                          {new Date(fb.created_at).toLocaleDateString("it-IT", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <p className="text-white/80 text-sm leading-relaxed">{fb.text}</p>

                    {fb.photos && fb.photos.length > 0 && (
                      <div className="photo-grid mt-3">
                        {fb.photos.map((photo, j) => (
                          <div key={j} className="relative aspect-square rounded overflow-hidden">
                            <img
                              src={`${BACKEND_URL}${photo}`}
                              alt={`Foto ${j + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(`${BACKEND_URL}${photo}`, "_blank")}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
