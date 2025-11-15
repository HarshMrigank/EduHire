import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Star, DollarSign, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function TutorProfile() {
  const { tutorId } = useParams();
  const [tutor, setTutor] = useState<any>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchTutorProfile();
    fetchRatings();
  }, [tutorId]);

  const fetchTutorProfile = async () => {
    const { data } = await supabase
      .from('tutor_profiles')
      .select(`
        *,
        profiles!tutor_profiles_user_id_fkey (name, email)
      `)
      .eq('user_id', tutorId)
      .single();

    if (data) {
      setTutor(data);
    }
  };

  const fetchRatings = async () => {
    const { data } = await supabase
      .from('ratings')
      .select(`
        *,
        bookings!inner (
          tutor_id,
          student_id,
          profiles!bookings_student_id_fkey (name)
        )
      `)
      .eq('bookings.tutor_id', tutorId);

    if (data) {
      setRatings(data);
    }
  };

  const handleBookSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tutor) return;

    setLoading(true);

    const { error } = await supabase.from('bookings').insert({
      student_id: user.id,
      tutor_id: tutor.user_id,
      start_time: startTime,
      end_time: endTime,
      status: 'PENDING',
    });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Booking request sent successfully',
      });
      setDialogOpen(false);
      setStartTime('');
      setEndTime('');
    }

    setLoading(false);
  };

  const averageRating = ratings.length > 0
    ? (ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length).toFixed(1)
    : null;

  if (!tutor) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const subjectList = tutor.subjects?.split(',').map((s: string) => s.trim()) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">{tutor.profiles?.name}</CardTitle>
              <CardDescription className="flex items-center gap-4 text-base">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-5 w-5" />
                  ${tutor.hourly_rate}/hour
                </span>
                {averageRating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    {averageRating} ({ratings.length} reviews)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-foreground">About</h3>
                <p className="text-muted-foreground">{tutor.bio || 'No bio provided'}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-foreground">Subjects</h3>
                <div className="flex flex-wrap gap-2">
                  {subjectList.map((subject: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{subject}</Badge>
                  ))}
                </div>
              </div>

              {tutor.availability && (
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Availability</h3>
                  <p className="text-muted-foreground">{tutor.availability}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-4 text-foreground">Student Reviews</h3>
                <div className="space-y-4">
                  {ratings.map((rating) => (
                    <div key={rating.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[...Array(rating.rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          by {rating.bookings?.profiles?.name || 'Anonymous'}
                        </span>
                      </div>
                      {rating.comment && (
                        <p className="text-sm text-muted-foreground">{rating.comment}</p>
                      )}
                    </div>
                  ))}
                  {ratings.length === 0 && (
                    <p className="text-muted-foreground">No reviews yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Book a Session</CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Session
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Book Session with {tutor.profiles?.name}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleBookSession} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">End Time</Label>
                      <Input
                        id="endTime"
                        type="datetime-local"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Booking...' : 'Confirm Booking'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
