import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { TutorCard } from '@/components/TutorCard';
import { supabase } from '@/integrations/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Search, Calendar, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function StudentDashboard() {
  const [tutors, setTutors] = useState<any[]>([]);
  const [filteredTutors, setFilteredTutors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTutors();
    fetchBookings();
  }, [user]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = tutors.filter(tutor =>
        tutor.subjects.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tutor.profiles.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTutors(filtered);
    } else {
      setFilteredTutors(tutors);
    }
  }, [searchTerm, tutors]);

  const fetchTutors = async () => {
    const { data } = await supabase
      .from('tutor_profiles')
      .select(`
        id,
        user_id,
        bio,
        subjects,
        hourly_rate,
        availability,
        profiles!tutor_profiles_user_id_fkey (name)
      `);

    if (data) {
      setTutors(data);
      setFilteredTutors(data);
    }
  };

  const fetchBookings = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        tutor:tutor_id (
          id,
          email
        ),
        profiles!bookings_tutor_id_fkey (name),
        ratings (
          id,
          rating,
          comment
        )
      `)
      .eq('student_id', user.id)
      .order('start_time', { ascending: false });

    if (data) {
      setBookings(data);
    }
  };

  const handleSubmitRating = async () => {
    if (!selectedBooking) return;

    const { error } = await supabase
      .from('ratings')
      .insert({
        booking_id: selectedBooking.id,
        rating,
        comment,
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
        description: 'Rating submitted successfully',
      });
      setSelectedBooking(null);
      setComment('');
      setRating(5);
      fetchBookings();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PENDING: 'secondary',
      ACCEPTED: 'default',
      REJECTED: 'destructive',
      COMPLETED: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="tutors" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="tutors">Find Tutors</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
          </TabsList>

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
                  name={tutor.profiles?.name || 'Unknown'}
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

          <TabsContent value="bookings" className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-foreground">{booking.profiles?.name || 'Tutor'}</CardTitle>
                      <CardDescription>
                        <Calendar className="inline h-4 w-4 mr-1" />
                        {new Date(booking.start_time).toLocaleString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Duration: {new Date(booking.start_time).toLocaleTimeString()} - {new Date(booking.end_time).toLocaleTimeString()}
                  </div>

                  {booking.status === 'COMPLETED' && !booking.ratings?.length && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button onClick={() => setSelectedBooking(booking)} variant="outline" size="sm">
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
                                  variant={rating === value ? 'default' : 'outline'}
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
                              onChange={(e) => setComment(e.target.value)}
                              placeholder="Share your experience..."
                            />
                          </div>
                          <Button onClick={handleSubmitRating} className="w-full">
                            Submit Rating
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {booking.ratings?.length > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">Your Rating: {booking.ratings[0].rating}/5</span>
                      </div>
                      {booking.ratings[0].comment && (
                        <p className="text-sm text-muted-foreground">{booking.ratings[0].comment}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

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
