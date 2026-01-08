import { useAuth } from './useAuth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DemoRestriction {
    id: number;
    role: string;
    feature_key: string;
    label: string;
    is_locked: boolean;
}

export function useDemoRestrictions() {
    const { user } = useAuth();

    // Superadmin view: fetch all full restriction objects
    const { data: adminRestrictions } = useQuery({
        queryKey: ['demo-restrictions-admin'],
        queryFn: async () => {
            const res = await api.get('/api/superadmin/demo-restrictions');
            return res.data as DemoRestriction[];
        },
        enabled: !!user && (user.role === 'superadmin'),
    });

    // User view: fetch my locked keys
    const { data: myLockedKeys, isLoading } = useQuery({
        queryKey: ['my-restrictions'],
        queryFn: async () => {
            // Use the new profile endpoint
            const res = await api.get('/api/profile/me/restrictions');
            return res.data.restrictions as string[];
        },
        // Enable for everyone logged in. If not demo, returns empty.
        enabled: !!user,
    });

    const isFeatureLocked = (featureKey: string) => {
        // If superadmin, nothing is locked for them personally
        if (user?.role === 'superadmin') return false;

        // If user is demo user OR from demo organization, check myLockedKeys.
        if (user?.is_demo_user || user?.is_demo_organization) {
            return myLockedKeys?.includes(featureKey) ?? false;
        }
        return false;
    };

    return {
        restrictions: adminRestrictions, // For admin page
        isLoading,
        isFeatureLocked
    };
}
