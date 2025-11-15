import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, DollarSign } from 'lucide-react';

interface TutorCardProps {
  id: string;
  name: string;
  subjects: string;
  hourlyRate: number;
  bio?: string;
  averageRating?: number;
}

export function TutorCard({ id, name, subjects, hourlyRate, bio, averageRating }: TutorCardProps) {
  const subjectList = subjects.split(',').map(s => s.trim());

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-foreground">{name}</CardTitle>
        <CardDescription className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          ${hourlyRate}/hour
          {averageRating && (
            <span className="flex items-center gap-1 ml-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {averageRating.toFixed(1)}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {bio && <p className="text-sm text-muted-foreground line-clamp-2">{bio}</p>}
        <div className="flex flex-wrap gap-2">
          {subjectList.map((subject, idx) => (
            <Badge key={idx} variant="secondary">{subject}</Badge>
          ))}
        </div>
        <Link to={`/tutors/${id}`}>
          <Button className="w-full">View Profile</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
