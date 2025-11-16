import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { TutorCard } from "@/components/TutorCard";
import { supabase } from "@/integrations/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Search, Calendar, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function StudentDashboard() {
  const [tutors, setTutors] = useState<any[]>([]);
  const [filteredTutors, setFilteredTutors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    fetchTutors();
    fetchBookings();
  }, [user]);

  // ---- TUTORS ----
  const fetchTutors = async () => {
    const { data: tutorData, error: tutorError } = await supabase
      .from("tutor_profiles")
      .select("id, user_id, bio, subjects, hourly_rate, availability");

    if (tutorError) {
      console.error("Error fetching tutor_profiles:", tutorError);
      toast({
        title: "Error loading tutors",
        description: tutorError.message,
        variant: "destructive",
      });
      setTutors([]);
      setFilteredTutors([]);
      return;
    }

    if (!tutorData || tutorData.length === 0) {
      setTutors([]);
      setFilteredTutors([]);
      return;
    }

    const userIds = tutorData.map((t) => t.user_id);

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", userIds);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
    }

    const profileMap: Record<string, string> = {};
    (profileData || []).forEach((p: any) => {
      profileMap[p.id] = p.name;
    });

    const tutorsWithNames = tutorData.map((t: any) => ({
      ...t,
      name: profileMap[t.user_id] || "Unknown",
    }));

    setTutors(tutorsWithNames);
    setFilteredTutors(tutorsWithNames);
  };

  // ---- BOOKINGS (for student) ----
  const fetchBookings = async () => {
    if (!user) return;

    // 1) get bookings for this student
    const { data, error } = await supabase
      .from("bookings")
      .select("id, tutor_id, start_time, end_time, status, created_at")
      .eq("student_id", user.id)
      .order("start_time", { ascending: false });

    if (error) {
      console.error("Error fetching student bookings:", error);
      toast({
        title: "Error loading bookings",
        description: error.message,
        variant: "destructive",
      });
      setBookings([]);
      return;
    }

    if (!data || data.length === 0) {
      setBookings([]);
      return;
    }

    const tutorIds = Array.from(
      new Set(data.map((b: any) => b.tutor_id).filter(Boolean))
    );

    let tutorProfileMap: Record<
      string,
      { name: string | null; email: string | null; hourly_rate: number | null }
    > = {};

    if (tutorIds.length > 0) {
      // get tutor basic info from profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", tutorIds);

      if (profilesError) {
        console.error("Error fetching tutor profiles:", profilesError);
      }

      const { data: tutorDetailsData, error: tutorDetailsError } =
        await supabase
          .from("tutor_profiles")
          .select("user_id, hourly_rate")
          .in("user_id", tutorIds);

      if (tutorDetailsError) {
        console.error("Error fetching tutor hourly rates:", tutorDetailsError);
      }

      const profileMap: Record<string, { name: string | null; email: string | null }> = {};
      (profilesData || []).forEach((p: any) => {
        profileMap[p.id] = { name: p.name, email: p.email };
      });

      const hourlyMap: Record<string, number | null> = {};
      (tutorDetailsData || []).forEach((t: any) => {
        hourlyMap[t.user_id] = t.hourly_rate ?? null;
      });

      tutorIds.forEach((id) => {
        tutorProfileMap[id] = {
          name: profileMap[id]?.name ?? null,
          email: profileMap[id]?.email ?? null,
          hourly_rate: hourlyMap[id] ?? null,
        };
      });
    }

    const bookingsWithTutorInfo = data.map((b: any) => ({
      ...b,
      tutorInfo: tutorProfileMap[b.tutor_id] || null,
    }));

    setBookings(bookingsWithTutorInfo);
  };

  // ---- SEARCH ----
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      setFilteredTutors(tutors);
      return;
    }

    const filtered = tutors.filter((tutor) => {
      const subjects = (tutor.subjects ?? "").toLowerCase();
      const name = (tutor.name ?? "").toLowerCase();
      return subjects.includes(term) || name.includes(term);
    });

    setFilteredTutors(filtered);
  }, [searchTerm, tutors]);

  // ---- RATING ----
  const handleSubmitRating = async () => {
    if (!selectedBooking) return;

    const { error } = await supabase.from("ratings").insert({
      booking_id: selectedBooking.id,
      rating,
      comment,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Rating submitted successfully",
      });
      setSelectedBooking(null);
      setComment("");
      setRating(5);
      fetchBookings();
      fetchTutors(); // refresh any averages, if you show later
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      PENDING: "secondary",
      ACCEPTED: "default",
      REJECTED: "destructive",
      COMPLETED: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Tabs
          defaultValue="tutors"
          className="space-y-6"
          onValueChange={(val) => {
            if (val === "bookings") {
              fetchBookings();
            }
          }}
        >
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="tutors">Find Tutors</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
          </TabsList>

          {/* TUTORS TAB */}
          <TabsContent value="tutors" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="search">Search by subject or name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="e.g. Mathematics, Physics..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTutors.map((tutor) => (
                <TutorCard
                  key={tutor.id}
                  id={tutor.user_id}
                  name={tutor.name || "Unknown"}
                  subjects={tutor.subjects}
                  hourlyRate={tutor.hourly_rate}
                  bio={tutor.bio}
                />
              ))}
            </div>

            {filteredTutors.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No tutors found matching your search.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* BOOKINGS TAB */}
          <TabsContent value="bookings" className="space-y-4">
            {bookings.map((booking) => {
              const tutorName = booking.tutorInfo?.name || "Tutor";
              const tutorEmail = booking.tutorInfo?.email || null;
              const hourly = booking.tutorInfo?.hourly_rate || null;

              return (
                <Card key={booking.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-foreground">
                          {tutorName}
                        </CardTitle>
                        <CardDescription className="space-y-1">
                          <div>
                            <Calendar className="inline h-4 w-4 mr-1" />
                            {new Date(booking.start_time).toLocaleString()}
                          </div>
                          {tutorEmail && (
                            <div className="text-xs text-muted-foreground">
                              Tutor Email: {tutorEmail}
                            </div>
                          )}
                          {hourly && (
                            <div className="text-xs text-muted-foreground">
                              Hourly Rate: ₹{hourly} / hour
                            </div>
                          )}
                        </CardDescription>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Duration:{" "}
                      {new Date(booking.start_time).toLocaleTimeString()} –{" "}
                      {new Date(booking.end_time).toLocaleTimeString()}
                    </div>

                    {/* Confirmation / instructions when ACCEPTED */}
                    {booking.status === "ACCEPTED" && (
                      <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-sm space-y-1">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                          ✅ Booking Confirmed
                        </div>
                        <div>
                          Your session with <strong>{tutorName}</strong> has
                          been accepted.
                        </div>
                        {tutorEmail && (
                          <div>
                            Contact your tutor at{" "}
                            <span className="font-mono">{tutorEmail}</span> to
                            finalise meeting link (Zoom/Meet) and payment.
                          </div>
                        )}
                        {hourly && (
                          <div>
                            Agreed hourly rate: <strong>₹{hourly}</strong> per
                            hour. You can pay via UPI / bank transfer as
                            discussed with the tutor.
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          * Demo class details and exact schedule can be
                          discussed directly over email or chat.
                        </div>
                      </div>
                    )}

                    {/* Rating UI when COMPLETED and no rating yet */}
                    {booking.status === "COMPLETED" &&
                      !booking.ratings?.length && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              onClick={() => setSelectedBooking(booking)}
                              variant="outline"
                              size="sm"
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Rate Session
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Rate Your Session</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Rating (1-5)</Label>
                                <div className="flex gap-2">
                                  {[1, 2, 3, 4, 5].map((value) => (
                                    <Button
                                      key={value}
                                      type="button"
                                      variant={
                                        rating === value ? "default" : "outline"
                                      }
                                      size="sm"
                                      onClick={() => setRating(value)}
                                    >
                                      {value}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="comment">Comment</Label>
                                <Textarea
                                  id="comment"
                                  value={comment}
                                  onChange={(e) =>
                                    setComment(e.target.value)
                                  }
                                  placeholder="Share your experience..."
                                />
                              </div>
                              <Button
                                onClick={handleSubmitRating}
                                className="w-full"
                              >
                                Submit Rating
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                    {/* Already rated */}
                    {booking.ratings?.length > 0 && (
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">
                            Your Rating: {booking.ratings[0].rating}/5
                          </span>
                        </div>
                        {booking.ratings[0].comment && (
                          <p className="text-sm text-muted-foreground">
                            {booking.ratings[0].comment}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {bookings.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  You haven't booked any sessions yet.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
