import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  MessageSquare,
  Calendar,
  Clock,
  Search,
  Plus,
  AlertTriangle
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function History() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    sessions,
    isLoading,
    deleteSession,
    deleteAllHistory,
    totalSessions,
    totalMessages,
    getOldSessions,
    deleteSessionsOlderThan
  } = useChatHistory();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "messages">("recent");

  // Listen for cleanup events
  useEffect(() => {
    const handleCleanup = (event: CustomEvent) => {
      const { deletedSessions, remainingSessions } = event.detail;

      if (deletedSessions.length > 0) {
        toast({
          title: "Chat History Cleaned Up",
          description: `Automatically removed ${deletedSessions.length} old session(s) older than 30 days. ${remainingSessions} session(s) remaining.`,
          duration: 5000,
        });
      }
    };

    const handleManualCleanup = (event: CustomEvent) => {
      const { deletedSessions, daysOld, remainingSessions } = event.detail;

      if (deletedSessions.length > 0) {
        toast({
          title: "Old Sessions Deleted",
          description: `Manually removed ${deletedSessions.length} session(s) older than ${daysOld} days. ${remainingSessions} session(s) remaining.`,
          duration: 5000,
        });
      } else {
        toast({
          title: "No Old Sessions",
          description: `No sessions found older than ${daysOld} days.`,
          duration: 3000,
        });
      }
    };

    window.addEventListener('chatHistoryCleanedUp', handleCleanup as EventListener);
    window.addEventListener('chatSessionsDeletedByAge', handleManualCleanup as EventListener);

    return () => {
      window.removeEventListener('chatHistoryCleanedUp', handleCleanup as EventListener);
      window.removeEventListener('chatSessionsDeletedByAge', handleManualCleanup as EventListener);
    };
  }, [toast]);

  // Show warning if there are sessions approaching 30 days
  const oldSessions = useMemo(() => getOldSessions(25), [sessions, getOldSessions]);

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let filtered = sessions.filter(session =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort sessions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return a.createdAt.getTime() - b.createdAt.getTime();
        case "messages":
          return b.messages.length - a.messages.length;
        case "recent":
        default:
          return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
    });

    return filtered;
  }, [sessions, searchQuery, sortBy]);

  const handleDeleteSession = (sessionId: string) => {
    deleteSession(sessionId);
  };

  const handleDeleteAllHistory = () => {
    deleteAllHistory();
  };

  const handleCleanupOldSessions = () => {
    deleteSessionsOlderThan(30);
  };

  const handleNewChat = () => {
    navigate('/chat');
  };

  const handleOpenSession = (sessionId: string) => {
    navigate('/chat', { state: { sessionId } });
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-gradient-to-b from-primary to-primary/60 rounded-full"></div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'} amoled-text`}>
              Chat History
            </h1>
          </div>
          <p className={`text-sm sm:text-base ${isDark ? 'text-slate-300' : 'text-slate-600'} ml-4`}>
            Manage your chat sessions and conversations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleNewChat}
            className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary shadow-lg press-feedback border-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <Card className={cn(
          "mobile-shadow border-2 relative overflow-hidden group transition-all duration-300 hover:scale-[1.02]",
          isDark
            ? "bg-gradient-to-br from-slate-900/95 to-slate-800/95 border-blue-500/20 hover:border-blue-500/40"
            : "bg-gradient-to-br from-white to-blue-50/30 border-blue-200/50 hover:border-blue-300/60"
        )}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardContent className="p-4 sm:p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(
                  "text-sm font-medium flex items-center gap-2",
                  isDark ? "text-blue-300" : "text-blue-700"
                )}>
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Total Sessions
                </p>
                <p className={`text-2xl sm:text-3xl font-bold mt-1 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent`}>
                  {totalSessions}
                </p>
                <p className={cn(
                  "text-xs mt-1 ml-3",
                  isDark ? "text-slate-400" : "text-slate-500"
                )}>
                  Active conversations
                </p>
              </div>
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                isDark ? "bg-blue-600/20" : "bg-blue-100"
              )}>
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "mobile-shadow border-2 relative overflow-hidden group transition-all duration-300 hover:scale-[1.02]",
          isDark
            ? "bg-gradient-to-br from-slate-900/95 to-slate-800/95 border-purple-500/20 hover:border-purple-500/40"
            : "bg-gradient-to-br from-white to-purple-50/30 border-purple-200/50 hover:border-purple-300/60"
        )}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardContent className="p-4 sm:p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(
                  "text-sm font-medium flex items-center gap-2",
                  isDark ? "text-purple-300" : "text-purple-700"
                )}>
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  Total Messages
                </p>
                <p className={`text-2xl sm:text-3xl font-bold mt-1 bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent`}>
                  {totalMessages}
                </p>
                <p className={cn(
                  "text-xs mt-1 ml-3",
                  isDark ? "text-slate-400" : "text-slate-500"
                )}>
                  Message exchanges
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white text-sm font-bold">#</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Warning for old sessions */}
      {oldSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className={cn(
            "mobile-shadow border-2 relative overflow-hidden group",
            isDark
              ? "bg-gradient-to-br from-amber-950/95 to-orange-950/90 border-amber-600/30"
              : "bg-gradient-to-br from-amber-50/95 to-orange-50/50 border-amber-300/50"
          )}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600"></div>
            <CardContent className="p-4 relative">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse",
                  isDark ? "bg-amber-600/20" : "bg-amber-100"
                )}>
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm flex items-center gap-2 ${isDark ? 'text-amber-100' : 'text-amber-900'}`}>
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    Old Chat Sessions Detected
                  </h3>
                  <p className={`text-sm mt-2 leading-relaxed ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      {oldSessions.length} session(s)
                    </span>{" "}
                    are older than 25 days and will be automatically deleted in{" "}
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      {30 - Math.floor((Date.now() - new Date(Math.min(...oldSessions.map(s => s.updatedAt.getTime()))).getTime()) / (1000 * 60 * 60 * 24))} days
                    </span>
                    .
                  </p>
                  <div className="flex items-center gap-3 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCleanupOldSessions}
                      className="text-xs h-8 border-amber-600 text-amber-700 hover:bg-amber-100 dark:border-amber-400 dark:text-amber-300 dark:hover:bg-amber-900/30 press-feedback"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Clean Up Now
                    </Button>
                    <div className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      isDark ? "bg-amber-600/20 text-amber-300" : "bg-amber-100 text-amber-700"
                    )}>
                      Auto-cleanup enabled
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            type="text"
            placeholder="Search chat sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-12 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-primary/50 mobile-shadow transition-all duration-200",
              isDark
                ? "bg-slate-800/60 border-slate-700/50 text-slate-200 placeholder:text-slate-400 focus:border-primary/30"
                : "bg-white/50 border-slate-200/50 text-slate-900 placeholder:text-slate-500 focus:border-primary/30"
            )}
          />
          {searchQuery && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={cn(
              "px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200",
              isDark
                ? "bg-slate-800/60 border-slate-700/50 text-slate-200 focus:border-primary/30"
                : "bg-white/50 border-slate-200/50 text-slate-900 focus:border-primary/30"
            )}
          >
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest</option>
            <option value="messages">Most Messages</option>
          </select>
          {sessions.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 border-0 shadow-md press-feedback">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className={cn(
                "mobile-shadow border-2",
                isDark ? "bg-gradient-to-br from-slate-900 to-slate-800 border-red-500/20" : "bg-gradient-to-br from-white to-slate-50 border-red-200"
              )}>
                <AlertDialogHeader>
                  <AlertDialogTitle className={cn(
                    "flex items-center gap-2",
                    isDark ? 'text-red-300' : 'text-red-700'
                  )}>
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    Clear All History?
                  </AlertDialogTitle>
                  <AlertDialogDescription className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                    This will permanently delete all <span className="font-semibold text-red-600 dark:text-red-400">{totalSessions}</span> chat sessions and <span className="font-semibold text-red-600 dark:text-red-400">{totalMessages}</span> messages.
                    <br />
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-slate-300 dark:border-slate-600">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllHistory}
                    className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 border-0"
                  >
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </motion.div>

      {/* Chat Sessions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        {filteredSessions.length === 0 ? (
          <Card className={cn(
            "mobile-shadow border-2 relative overflow-hidden",
            isDark
              ? "bg-gradient-to-br from-slate-900/95 to-slate-800/95 border-slate-700/50"
              : "bg-gradient-to-br from-white to-slate-50/50 border-slate-200"
          )}>
            <CardContent className="p-8 sm:p-12 text-center relative">
              {searchQuery && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-400"></div>
              )}
              <div className={cn(
                "w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6",
                searchQuery
                  ? "bg-gradient-to-br from-orange-500 to-orange-600"
                  : "bg-gradient-to-br from-primary to-primary/60"
              )}>
                {searchQuery ? (
                  <Search className="w-10 h-10 text-white" />
                ) : (
                  <MessageSquare className="w-10 h-10 text-white" />
                )}
              </div>
              <h3 className={`text-xl sm:text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {searchQuery ? 'No matching sessions found' : 'No chat sessions yet'}
              </h3>
              <p className={`text-base ${isDark ? 'text-slate-300' : 'text-slate-600'} mb-6 max-w-md mx-auto`}>
                {searchQuery
                  ? 'Try adjusting your search terms or browse all conversations'
                  : 'Start your first conversation with Daemon AI and begin your journey'
                }
              </p>
              <Button
                onClick={handleNewChat}
                className={cn(
                  "press-feedback border-0 shadow-lg",
                  searchQuery
                    ? "bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500"
                    : "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary"
                )}
              >
                <Plus className="w-4 h-4 mr-2" />
                {searchQuery ? 'Clear Search' : 'Start New Chat'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredSessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
            >
              <Card
                className={cn(
                  "mobile-shadow cursor-pointer hover:shadow-lg transition-all duration-300 press-feedback border-2 relative overflow-hidden group",
                  isDark
                    ? "bg-gradient-to-br from-slate-900/95 to-slate-800/95 border-slate-700/50 hover:border-primary/30"
                    : "bg-gradient-to-br from-white to-slate-50/50 border-slate-200 hover:border-primary/20"
                )}
                onClick={() => handleOpenSession(session.id)}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-primary/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardContent className="p-4 sm:p-6 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className={`font-semibold text-base sm:text-lg mb-3 truncate ${isDark ? 'text-white' : 'text-slate-900'} group-hover:text-primary transition-colors duration-200`}>
                        {session.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            isDark ? "bg-blue-600/20" : "bg-blue-100"
                          )}>
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <span className={cn(
                              "font-medium",
                              isDark ? 'text-blue-300' : 'text-blue-700'
                            )}>
                              {session.messages.length}
                            </span>
                            <span className={cn(
                              "ml-1",
                              isDark ? 'text-slate-400' : 'text-slate-600'
                            )}>
                              messages
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                          <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                            {formatDate(session.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                          <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                            {session.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs px-2 py-1 border",
                          session.messages.length > 0
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                        )}
                      >
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full mr-1",
                          session.messages.length > 0 ? "bg-green-500" : "bg-slate-400"
                        )}></div>
                        {session.messages.length > 0 ? 'Active' : 'Empty'}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className="hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 group-hover:scale-110"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className={cn(
                          "mobile-shadow border-2",
                          isDark ? "bg-gradient-to-br from-slate-900 to-slate-800 border-red-500/20" : "bg-gradient-to-br from-white to-slate-50 border-red-200"
                        )}>
                          <AlertDialogHeader>
                            <AlertDialogTitle className={cn(
                              "flex items-center gap-2",
                              isDark ? 'text-red-300' : 'text-red-700'
                            )}>
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                              Delete Chat Session?
                            </AlertDialogTitle>
                            <AlertDialogDescription className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                              This will permanently delete the chat session
                              <span className="font-semibold text-red-600 dark:text-red-400"> "{session.title}"</span>
                              <br />
                              and all its {session.messages.length} messages. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-slate-300 dark:border-slate-600">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(session.id);
                              }}
                              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 border-0"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}