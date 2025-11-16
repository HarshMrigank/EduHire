// src/pages/TutorProfileEdit.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function TutorProfileEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [bio, setBio] = useState("");
  const [subjects, setSubjects] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [availability, setAvailability] = useState("");
  const [qualification, setQualification] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [background, setBackground] = useState("");
  const [languages, setLanguages] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("tutor_profiles")
      .select(
        `
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
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching tutor profile:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setInitialLoading(false);
      return;
    }

    if (data) {
      setBio(data.bio || "");
      setSubjects(data.subjects || "");
      setHourlyRate(
        data.hourly_rate != null ? String(data.hourly_rate) : ""
      );
      setAvailability(data.availability || "");
      setQualification(data.qualification || "");
      setExperienceYears(
        data.experience_years != null ? String(data.experience_years) : ""
      );
      setSpecialties(data.specialties || "");
      setProfileImageUrl(data.profile_image_url || "");
      setBackground(data.background || "");
      setLanguages(data.languages || "");
    }

    setInitialLoading(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const hourly = parseFloat(hourlyRate);
    const expYears = parseInt(experienceYears || "0", 10);

    const profileData = {
      user_id: user.id,
      bio,
      subjects,
      hourly_rate: Number.isNaN(hourly) ? null : hourly,
      availability,
      qualification,
      experience_years: Number.isNaN(expYears) ? null : expYears,
      specialties,
      profile_image_url: profileImageUrl || null,
      background,
      languages,
    };

    // upsert-like behavior
    const { data: existing, error: checkError } = await supabase
      .from("tutor_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking tutor profile:", checkError);
    }

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("tutor_profiles")
        .update(profileData)
        .eq("user_id", user.id));
    } else {
      ({ error } = await supabase.from("tutor_profiles").insert(profileData));
    }

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Profile updated",
        description: "Your tutor profile has been saved.",
      });
      // optional: go back to dashboard
      // navigate("/tutor/dashboard");
    }

    setLoading(false);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-10 flex items-center justify-center">
          <p className="text-muted-foreground text-lg">
            Loading profile editor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Edit Tutor Profile</h1>
            <p className="text-sm text-muted-foreground">
              This information is shown to students on your public profile.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/tutor/dashboard")}>
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>
              Add more details to make your profile stand out.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profileImageUrl">Profile Photo URL</Label>
                <Input
                  id="profileImageUrl"
                  placeholder="Paste an image URL (e.g. from Cloudinary/Drive)"
                  value={profileImageUrl}
                  onChange={(e) => setProfileImageUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualification">Qualification</Label>
                <Input
                  id="qualification"
                  placeholder="e.g. M.Sc Mathematics, IIT Madras"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="experienceYears">Experience (years)</Label>
                  <Input
                    id="experienceYears"
                    type="number"
                    min={0}
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    placeholder="e.g. 5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate (₹)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 500"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subjects">Subjects (comma-separated)</Label>
                <Input
                  id="subjects"
                  placeholder="e.g. Mathematics, Physics, Chemistry"
                  value={subjects}
                  onChange={(e) => setSubjects(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialties">Specialties</Label>
                <Input
                  id="specialties"
                  placeholder="e.g. JEE Advanced, CBSE Boards, Olympiads"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="languages">Languages (comma-separated)</Label>
                <Input
                  id="languages"
                  placeholder="e.g. English, Hindi, Bengali"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Short Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="One or two lines students see first..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="background">Detailed Background</Label>
                <Textarea
                  id="background"
                  placeholder="Share your teaching journey, achievements, and what students can expect from your classes..."
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="availability">Availability</Label>
                <Textarea
                  id="availability"
                  placeholder="e.g. Mon–Fri 5–9 PM, Sat–Sun 10–2 PM"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/tutor/dashboard")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
