import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { GraduationCap, LogOut } from 'lucide-react';

export function Navbar() {
  const { user, userRole, signOut } = useAuth();

  const getDashboardLink = () => {
    if (userRole === 'STUDENT') return '/student/dashboard';
    if (userRole === 'TUTOR') return '/tutor/dashboard';
    if (userRole === 'ADMIN') return '/admin/dashboard';
    return '/';
  };

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to={getDashboardLink()} className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">EduHire</span>
          </Link>
          
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {userRole}
              </span>
              <Button variant="outline" onClick={signOut} size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
