import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Check, X } from 'lucide-react';

export default function TutorDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [bio, setBio] = useState('');
  const [subjects, setSubjects] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [availability, setAvailability] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchBookings();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('tutor_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching tutor profile:', error);
      return;
    }

    if (data) {
      setProfile(data);
      setBio(data.bio || '');
      setSubjects(data.subjects || '');
      setHourlyRate(data.hourly_rate?.toString() || '');
      setAvailability(data.availability || '');
    }
  };

  const fetchBookings = async () => {
    if (!user) return;

    // 1) get bookings for this tutor
    const { data, error } = await supabase
      .from('bookings')
      .select('id, student_id, start_time, end_time, status, created_at')
      .eq('tutor_id', user.id)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching bookings for tutor:', error);
      toast({
        title: 'Error loading bookings',
        description: error.message,
        variant: 'destructive',
      });
      setBookings([]);
      return;
    }

    if (!data || data.length === 0) {
      setBookings([]);
      return;
    }

    // 2) fetch student profiles for those student_ids
    const studentIds = Array.from(
      new Set(data.map((b: any) => b.student_id).filter(Boolean))
    );

    let studentMap: Record<string, { name: string | null; email: string | null }> = {};

    if (studentIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', studentIds);

      if (profileError) {
        console.error('Error fetching student profiles:', profileError);
      } else {
        (profileData || []).forEach((p: any) => {
          studentMap[p.id] = { name: p.name, email: p.email };
        });
      }
    }

    const bookingsWithStudents = data.map((b: any) => ({
      ...b,
      studentProfile: studentMap[b.student_id] || null,
    }));

    setBookings(bookingsWithStudents);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const profileData = {
      user_id: user.id,
      bio,
      subjects,
      hourly_rate: parseFloat(hourlyRate),
      availability,
    };

    let error;
    if (profile) {
      ({ error } = await supabase
        .from('tutor_profiles')
        .update(profileData)
        .eq('user_id', user.id));
    } else {
      ({ error } = await supabase
        .from('tutor_profiles')
        .insert(profileData));
    }

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Profile saved successfully',
      });
      fetchProfile();
    }

    setLoading(false);
  };

  const handleBookingAction = async (bookingId: string, status: 'ACCEPTED' | 'REJECTED') => {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Booking ${status.toLowerCase()}`,
      });
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
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="profile">My Profile</TabsTrigger>
            <TabsTrigger value="bookings">Booking Requests</TabsTrigger>
          </TabsList>

          {/* PROFILE TAB */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Tutor Profile</CardTitle>
                <CardDescription>Manage your tutor information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell students about yourself..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subjects">Subjects (comma-separated)</Label>
                    <Input
                      id="subjects"
                      placeholder="e.g. Mathematics, Physics, Chemistry"
                      value={subjects}
                      onChange={(e) => setSubjects(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly Rate (₹)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      placeholder="500"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="availability">Availability</Label>
                    <Textarea
                      id="availability"
                      placeholder="e.g. Mon-Fri 9AM-5PM, Weekends by appointment"
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Profile'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BOOKINGS TAB */}
          <TabsContent value="bookings" className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-foreground">
                        {booking.studentProfile?.name || 'Student'}
                      </CardTitle>
                      <CardDescription className="space-y-1">
                        <div>
                          <Calendar className="inline h-4 w-4 mr-1" />
                          {new Date(booking.start_time).toLocaleString()}
                        </div>
                        {booking.studentProfile?.email && (
                          <div className="text-xs text-muted-foreground">
                            Email: {booking.studentProfile.email}
                          </div>
                        )}
                      </CardDescription>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Duration: {new Date(booking.start_time).toLocaleTimeString()} –{' '}
                      {new Date(booking.end_time).toLocaleTimeString()}
                    </div>

                    {booking.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleBookingAction(booking.id, 'ACCEPTED')}
                          size="sm"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          onClick={() => handleBookingAction(booking.id, 'REJECTED')}
                          variant="outline"
                          size="sm"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {bookings.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No booking requests yet.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
