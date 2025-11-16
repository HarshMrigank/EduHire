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

type TutorProfileRow = {
  id: number;
  user_id: string;
  bio: string | null;
  subjects: string | null;
  hourly_rate: number | null;
  availability: string | null;
};

type ProfileRow = {
  name: string | null;
  email: string | null;
};

export default function TutorProfile() {
  // /tutors/:tutorId → this should be tutor_profiles.user_id
  const { tutorId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [tutor, setTutor] = useState<TutorProfileRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
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

      // 1) Get tutor profile by user_id (tutorId from URL)
      const { data: tutorData, error: tutorError } = await supabase
        .from("tutor_profiles")
        .select("id, user_id, bio, subjects, hourly_rate, availability")
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
        // We can still show tutor without name/email
      }

      if (profileData) {
        setProfile(profileData as ProfileRow);
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

  const subjectList =
    tutor.subjects?.split(",").map((s) => s.trim()).filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          ← Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {profile?.name || "Tutor"}
            </CardTitle>
            <CardDescription>
              {profile?.email && (
                <span className="block text-sm text-muted-foreground">
                  {profile.email}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-1">About</h3>
              <p className="text-sm text-muted-foreground">
                {tutor.bio || "This tutor has not added a bio yet."}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">Subjects</h3>
              {subjectList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {subjectList.map((subject, idx) => (
                    <Badge key={idx} variant="secondary">
                      {subject}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No subjects specified.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-6">
              <div>
                <h3 className="font-semibold mb-1">Hourly Rate</h3>
                <p className="text-sm text-muted-foreground">
                  {tutor.hourly_rate
                    ? `₹${tutor.hourly_rate} / hour`
                    : "Not specified"}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Availability</h3>
                <p className="text-sm text-muted-foreground">
                  {tutor.availability || "Not specified"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Book Session */}
        <Card>
          <CardHeader>
            <CardTitle>Book a Session</CardTitle>
            <CardDescription>
              Choose a suitable time slot to request a session with this tutor.
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
                  <Button>Schedule Session</Button>
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
