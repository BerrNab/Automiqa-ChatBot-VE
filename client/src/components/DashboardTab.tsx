import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardStats {
  totalClients: number;
  activeChatbots: number;
  monthlyRevenue: number;
  trialConversionRate: number;
}

interface RecentActivity {
  id: string;
  message: string;
  timestamp: string;
  type: "success" | "info" | "warning" | "error";
}

interface SubscriptionStatus {
  activePaid: number;
  freeTrial: number;
  paymentDue: number;
  expired: number;
}

export default function DashboardTab() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<RecentActivity[]>({
    queryKey: ["/api/dashboard/activities"],
  });

  const { data: subscriptionStats, isLoading: subscriptionLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/dashboard/subscription-status"],
  });

  if (statsLoading || activitiesLoading || subscriptionLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    const baseClasses = "w-2 h-2 rounded-full";
    switch (type) {
      case "success":
        return <div className={`${baseClasses} bg-green-500`}></div>;
      case "info":
        return <div className={`${baseClasses} bg-blue-500`}></div>;
      case "warning":
        return <div className={`${baseClasses} bg-yellow-500`}></div>;
      case "error":
        return <div className={`${baseClasses} bg-red-500`}></div>;
      default:
        return <div className={`${baseClasses} bg-gray-500`}></div>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Clients</p>
                <p className="text-3xl font-bold text-foreground" data-testid="text-total-clients">
                  {stats?.totalClients || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Active Chatbots</p>
                <p className="text-3xl font-bold text-foreground" data-testid="text-active-chatbots">
                  {stats?.activeChatbots || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/>
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Monthly Revenue</p>
                <p className="text-3xl font-bold text-foreground" data-testid="text-monthly-revenue">
                  ${stats?.monthlyRevenue?.toLocaleString() || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Trial Conversions</p>
                <p className="text-3xl font-bold text-foreground" data-testid="text-trial-conversions">
                  {stats?.trialConversionRate || 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Subscription Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold">Recent Client Activity</h3>
            <p className="text-muted-foreground text-sm">Latest client onboarding and status changes</p>
          </div>
          <CardContent className="p-6">
            <div className="space-y-4" data-testid="list-recent-activities">
              {activities?.length ? (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold">Subscription Status</h3>
            <p className="text-muted-foreground text-sm">Current subscription distribution</p>
          </div>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Active Paid</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold" data-testid="text-active-paid">
                    {subscriptionStats?.activePaid || 0}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">clients</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium">Free Trial</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold" data-testid="text-free-trial">
                    {subscriptionStats?.freeTrial || 0}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">clients</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium">Payment Due</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold" data-testid="text-payment-due">
                    {subscriptionStats?.paymentDue || 0}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">clients</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium">Expired</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold" data-testid="text-expired">
                    {subscriptionStats?.expired || 0}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">clients</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
