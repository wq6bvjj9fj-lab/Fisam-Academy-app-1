import React, { useState, useEffect, useCallback } from "react";
import { useAuth, API } from "@/App";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Users, Trash2, Mail, Loader2, UserPlus, Eye, EyeOff, AlertTriangle, Shield
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StudentsPage() {
  const { token, isInstructor, user: currentUser } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState("student");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/users`, { headers });
      setUsers(data);
    } catch {
      toast.error("Errore nel caricamento utenti");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isInstructor) fetchUsers();
  }, [fetchUsers, isInstructor]);

  if (!isInstructor) return <Navigate to="/lessons" replace />;

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Compila tutti i campi");
      return;
    }
    setCreating(true);
    try {
      await axios.post(`${API}/users`, { name, email, password, role }, { headers });
      toast.success(role === "instructor" ? "Istruttore creato!" : "Allievo creato!");
      setCreateOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("student");
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Errore nella creazione");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId) => {
    try {
      await axios.delete(`${API}/users/${userId}`, { headers });
      toast.success("Utente eliminato");
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Errore nell'eliminazione");
    }
  };

  const students = users.filter((u) => u.role === "student");
  const instructors = users.filter((u) => u.role === "instructor");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#F5A623] animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="students-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="text-2xl md:text-3xl font-bold tracking-wider text-white uppercase"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            Gestione Utenti
          </h2>
          <p className="text-white/40 text-sm mt-1">{instructors.length} istruttori, {students.length} allievi</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="bg-[#F5A623] text-black hover:bg-[#E0961F] font-bold uppercase tracking-wider rounded-sm px-5 py-2.5 text-sm transition-all active:scale-95 flex items-center gap-2"
          data-testid="create-student-button"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuovo Utente</span>
        </button>
      </div>

      {/* Instructors */}
      {instructors.length > 0 && (
        <div className="mb-6">
          <h3
            className="text-white/50 text-sm tracking-wider uppercase mb-3"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            Istruttori
          </h3>
          <div className="space-y-2">
            {instructors.map((user) => (
              <div
                key={user.id}
                className="bg-[#121212] border border-[#F5A623]/20 rounded-md p-4 flex items-center gap-4"
                data-testid={`instructor-card-${user.id}`}
              >
                <div className="w-10 h-10 rounded-full bg-[#F5A623]/20 flex items-center justify-center text-[#F5A623] font-bold">
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{user.name}</p>
                  <p className="text-white/40 text-sm truncate flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {user.email}
                  </p>
                </div>
                <Badge className="bg-[#F5A623]/20 text-[#F5A623] border-[#F5A623]/30 text-xs">
                  Istruttore
                </Badge>
                {user.id !== currentUser?.id && (
                  <button
                    onClick={() => setDeleteConfirm(user)}
                    className="text-white/20 hover:text-red-400 transition-colors p-2"
                    data-testid={`delete-instructor-${user.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Students */}
      <h3
        className="text-white/50 text-sm tracking-wider uppercase mb-3"
        style={{ fontFamily: "Barlow Condensed, sans-serif" }}
      >
        Allievi
      </h3>
      {students.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg">Nessun allievo registrato</p>
          <p className="text-sm mt-2">Aggiungi il tuo primo allievo</p>
        </div>
      ) : (
        <div className="space-y-2">
          {students.map((student, i) => (
            <div
              key={student.id}
              className={`bg-[#121212] border border-white/5 rounded-md p-4 flex items-center gap-4 hover:bg-[#1A1A1A] transition-colors animate-slide-up stagger-${Math.min(i + 1, 5)}`}
              style={{ opacity: 0 }}
              data-testid={`student-card-${student.id}`}
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold">
                {student.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{student.name}</p>
                <p className="text-white/40 text-sm truncate flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {student.email}
                </p>
              </div>
              <button
                onClick={() => setDeleteConfirm(student)}
                className="text-white/20 hover:text-red-400 transition-colors p-2"
                data-testid={`delete-student-${student.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Student Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#121212] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-white text-xl tracking-wider uppercase"
              style={{ fontFamily: "Barlow Condensed, sans-serif" }}
            >
              Nuovo Utente
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Crea un account per un nuovo utente
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateStudent} className="space-y-4 mt-2" data-testid="create-student-form">
            <div className="space-y-2">
              <Label className="text-white/70 text-xs tracking-wider uppercase">Ruolo</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger
                  className="bg-[#0A0A0A] border-white/20 text-white h-10 rounded-sm"
                  data-testid="user-role-select"
                >
                  <SelectValue placeholder="Seleziona ruolo" />
                </SelectTrigger>
                <SelectContent className="bg-[#121212] border-white/10">
                  <SelectItem value="student">Allievo</SelectItem>
                  <SelectItem value="instructor">Istruttore</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 text-xs tracking-wider uppercase">Nome completo</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mario Rossi"
                className="bg-[#0A0A0A] border-white/20 focus:border-[#F5A623] text-white h-10 rounded-sm placeholder:text-white/30"
                data-testid="student-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 text-xs tracking-wider uppercase">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mario@email.it"
                className="bg-[#0A0A0A] border-white/20 focus:border-[#F5A623] text-white h-10 rounded-sm placeholder:text-white/30"
                data-testid="student-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 text-xs tracking-wider uppercase">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="bg-[#0A0A0A] border-white/20 focus:border-[#F5A623] text-white h-10 rounded-sm pr-10 placeholder:text-white/30"
                  data-testid="student-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full bg-[#F5A623] text-black hover:bg-[#E0961F] font-bold uppercase tracking-wider rounded-sm px-6 py-3 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="student-submit-button"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  {role === "instructor" ? "Crea Istruttore" : "Crea Allievo"}
                </>
              )}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-[#121212] border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Conferma eliminazione
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Sei sicuro di voler eliminare l'allievo <strong className="text-white">{deleteConfirm?.name}</strong>?
              Questa azione non e' reversibile.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 bg-white/10 text-white hover:bg-white/20 font-semibold uppercase tracking-wider rounded-sm px-4 py-2.5 text-sm transition-colors"
              data-testid="cancel-delete-button"
            >
              Annulla
            </button>
            <button
              onClick={() => handleDelete(deleteConfirm?.id)}
              className="flex-1 bg-red-600 text-white hover:bg-red-700 font-semibold uppercase tracking-wider rounded-sm px-4 py-2.5 text-sm transition-colors"
              data-testid="confirm-delete-button"
            >
              Elimina
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
