// src/pages/TutorProfile.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Star, Calendar } from "lucide-react";

type TutorProfileRow = {
  id: number;
  user_id: string;
  bio: string | null;
  subjects: string | null;
  hourly_rate: number | null;
  availability: string | null;
  qualification: string | null;
  experience_years: number | null;
  specialties: string | null;
  profile_image_url: string | null;
  background: string | null;
  languages: string | null;
};

type ProfileRow = {
  name: string | null;
  email: string | null;
};

type RatingRow = {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  bookings?: {
    profiles?: {
      name: string | null;
    } | null;
  } | null;
};

export default function TutorProfile() {
  // /tutors/:tutorId → this is tutor_profiles.user_id
  const { tutorId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [tutor, setTutor] = useState<TutorProfileRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);

  // booking form
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (!tutorId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);

      // 1) Get tutor profile by user_id
      const { data: tutorData, error: tutorError } = await supabase
        .from("tutor_profiles")
        .select(
          `
          id,
          user_id,
          bio,
          subjects,
          hourly_rate,
          availability,
          qualification,
          experience_years,
          specialties,
          profile_image_url,
          background,
          languages
        `
        )
        .eq("user_id", tutorId)
        .maybeSingle();

      if (tutorError) {
        console.error("Error fetching tutor profile:", tutorError);
        toast({
          title: "Error",
          description: tutorError.message,
          variant: "destructive",
        });
        setTutor(null);
        setProfile(null);
        setRatings([]);
        setLoading(false);
        return;
      }

      if (!tutorData) {
        toast({
          title: "Not found",
          description: "Tutor profile not found.",
        });
        setTutor(null);
        setProfile(null);
        setRatings([]);
        setLoading(false);
        return;
      }

      setTutor(tutorData as TutorProfileRow);

      // 2) Get profile info (name, email)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", tutorData.user_id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile info:", profileError);
      }

      if (profileData) {
        setProfile(profileData as ProfileRow);
      }

      // 3) Fetch ratings + student names (if relationships exist)
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select(
          `
          id,
          rating,
          comment,
          created_at,
          bookings!inner(
            tutor_id,
            profiles!bookings_student_id_fkey(name)
          )
        `
        )
        .eq("bookings.tutor_id", tutorData.user_id)
        .order("created_at", { ascending: false });

      if (ratingsError) {
        console.error("Error fetching ratings:", ratingsError);
        setRatings([]);
      } else {
        setRatings((ratingsData || []) as RatingRow[]);
      }

      setLoading(false);
    };

    load();
  }, [tutorId, toast]);

  const handleBookSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tutor) {
      toast({
        title: "Not allowed",
        description: "You must be logged in as a student to book.",
        variant: "destructive",
      });
      return;
    }

    if (!startTime || !endTime) {
      toast({
        title: "Missing fields",
        description: "Please select both start and end time.",
        variant: "destructive",
      });
      return;
    }

    setBookingLoading(true);

    const { error } = await supabase.from("bookings").insert({
      student_id: user.id,
      tutor_id: tutor.user_id,
      start_time: startTime,
      end_time: endTime,
      status: "PENDING",
    });

    setBookingLoading(false);

    if (error) {
      console.error("Error creating booking:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Booking requested",
      description: "Your booking request has been sent to the tutor.",
    });

    setStartTime("");
    setEndTime("");
  };

  const averageRating =
    ratings.length > 0
      ? (
          ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length
        ).toFixed(1)
      : null;

  const subjectList =
    tutor?.subjects?.split(",").map((s) => s.trim()).filter(Boolean) || [];
  const specialtiesList =
    tutor?.specialties?.split(",").map((s) => s.trim()).filter(Boolean) || [];
  const languagesList =
    tutor?.languages?.split(",").map((s) => s.trim()).filter(Boolean) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-10 flex items-center justify-center">
          <p className="text-muted-foreground text-lg">
            Loading tutor profile...
          </p>
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-10 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground text-lg">
            Tutor profile not found.
          </p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const profileImage =
    tutor.profile_image_url ||
    "https://via.placeholder.com/160x160.png?text=Tutor";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        <Button variant="outline" onClick={() => navigate(-1)}>
          ← Back
        </Button>

        {/* TOP SECTION: Hero */}
        <div className="grid gap-6 md:grid-cols-[1fr,1.5fr] items-start">
          <Card className="overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400" />
            <CardContent className="-mt-12 flex flex-col items-center gap-4 pb-6 pt-0">
              <img
                src={profileImage}
                alt={profile?.name || "Tutor photo"}
                className="h-24 w-24 rounded-full border-4 border-background object-cover shadow-md"
              />
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-semibold">
                  {profile?.name || "Tutor"}
                </h1>
                {tutor.qualification && (
                  <p className="text-sm text-muted-foreground">
                    {tutor.qualification}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-xs">
                {tutor.experience_years != null && (
                  <Badge variant="secondary">
                    {tutor.experience_years}+ years experience
                  </Badge>
                )}
                {subjectList.length > 0 && (
                  <Badge variant="outline">{subjectList.join(" · ")}</Badge>
                )}
                {languagesList.length > 0 && (
                  <Badge variant="outline">
                    Languages: {languagesList.join(", ")}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm">
                {tutor.hourly_rate && (
                  <div>
                    <span className="font-semibold">
                      ₹{tutor.hourly_rate}
                    </span>{" "}
                    / hour
                  </div>
                )}
                {averageRating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{averageRating}</span>
                    <span className="text-xs text-muted-foreground">
                      ({ratings.length} reviews)
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Booking + quick info */}
          <Card>
            <CardHeader>
              <CardTitle>Book a Session</CardTitle>
              <CardDescription>
                Choose a suitable time slot to request a session with this
                tutor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!user ? (
                <p className="text-sm text-muted-foreground">
                  You need to be logged in as a student to book a session.
                </p>
              ) : (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full mb-4">Schedule Session</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        Book Session with {profile?.name || "Tutor"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleBookSession} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="start">Start Time</Label>
                        <Input
                          id="start"
                          type="datetime-local"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end">End Time</Label>
                        <Input
                          id="end"
                          type="datetime-local"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={bookingLoading}
                      >
                        {bookingLoading ? "Booking..." : "Confirm Booking"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}

              {tutor.availability && (
                <div className="mt-4 text-sm">
                  <div className="font-semibold mb-1">Availability</div>
                  <p className="text-muted-foreground">{tutor.availability}</p>
                </div>
              )}

              {tutor.specialties && (
                <div className="mt-4 text-sm">
                  <div className="font-semibold mb-1">Specialties</div>
                  <p className="text-muted-foreground">
                    {tutor.specialties}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ABOUT & BACKGROUND */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{tutor.bio || "This tutor has not added a short bio yet."}</p>
              {tutor.background && (
                <p>{tutor.background}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Highlights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-semibold mb-1">Subjects</div>
                {subjectList.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {subjectList.map((subject, idx) => (
                      <Badge key={idx} variant="secondary">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Not specified.</p>
                )}
              </div>
              <div>
                <div className="font-semibold mb-1">Languages</div>
                {languagesList.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {languagesList.map((lang, idx) => (
                      <Badge key={idx} variant="outline">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Not specified.</p>
                )}
              </div>
              {tutor.experience_years != null && (
                <div>
                  <div className="font-semibold mb-1">Experience</div>
                  <p className="text-muted-foreground">
                    {tutor.experience_years}+ years of teaching experience.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* STUDENT REVIEWS */}
        <Card>
          <CardHeader>
            <CardTitle>Student Feedback</CardTitle>
            <CardDescription>
              What other students say about learning with this tutor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ratings.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No reviews yet. Be the first to book a session and leave a
                review.
              </p>
            )}

            {ratings.map((rating) => {
              const studentName =
                rating.bookings?.profiles?.name || "Anonymous student";

              return (
                <div
                  key={rating.id}
                  className="border rounded-lg p-3 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i <= rating.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(rating.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-foreground">
                    {studentName}
                  </div>
                  {rating.comment && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {rating.comment}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
