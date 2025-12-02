import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home, ArrowLeft, Shield } from "lucide-react";

export default function AccessDenied() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the page name from location state or pathname
  const attemptedPage = location.state?.pageName || 
    location.pathname.split('/').pop()?.replace('-', ' ') || 
    'this page';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Card className="border-destructive">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Shield className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-3xl font-bold text-destructive">
                Access Denied
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                You don't have permission to access this page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 border border-muted">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Insufficient Permissions
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You attempted to access <span className="font-semibold">"{attemptedPage}"</span>, but your account doesn't have the required permissions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  If you believe you should have access to this page, please contact your administrator.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={() => navigate('/')}
                  className="flex-1"
                  size="lg"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
                <Button
                  onClick={() => navigate(-1)}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

