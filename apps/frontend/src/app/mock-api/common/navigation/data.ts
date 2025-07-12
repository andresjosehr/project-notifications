/* eslint-disable */
import { FuseNavigationItem } from '@fuse/components/navigation';

export const defaultNavigation: FuseNavigationItem[] = [
    {
        id: 'dashboard',
        title: 'Dashboard',
        type: 'basic',
        icon: 'heroicons_outline:home',
        link: '/dashboard'
    },
    {
        id: 'projects',
        title: 'Proyectos',
        type: 'basic',
        icon: 'heroicons_outline:briefcase',
        link: '/projects'
    },
    {
        id: 'proposals',
        title: 'Propuestas',
        type: 'basic',
        icon: 'heroicons_outline:document-text',
        link: '/proposals'
    },
    {
        id: 'admin',
        title: 'Administración',
        type: 'group',
        icon: 'heroicons_outline:cog-6-tooth',
        children: [
            {
                id: 'admin-dashboard',
                title: 'Dashboard Admin',
                type: 'basic',
                icon: 'heroicons_outline:chart-bar',
                link: '/admin/dashboard'
            },
            {
                id: 'admin-users',
                title: 'Usuarios',
                type: 'basic',
                icon: 'heroicons_outline:users',
                link: '/admin/users'
            },
            {
                id: 'admin-projects',
                title: 'Gestión de Proyectos',
                type: 'basic',
                icon: 'heroicons_outline:briefcase',
                link: '/admin/projects'
            }
        ]
    },
    {
        id: 'user',
        title: 'Usuario',
        type: 'group',
        icon: 'heroicons_outline:user',
        children: [
            {
                id: 'profile',
                title: 'Perfil',
                type: 'basic',
                icon: 'heroicons_outline:user-circle',
                link: '/profile'
            }
        ]
    }
];

export const compactNavigation: FuseNavigationItem[] = [
    {
        id: 'dashboard',
        title: 'Dashboard',
        type: 'basic',
        icon: 'heroicons_outline:home',
        link: '/dashboard'
    },
    {
        id: 'projects',
        title: 'Proyectos',
        type: 'basic',
        icon: 'heroicons_outline:briefcase',
        link: '/projects'
    },
    {
        id: 'proposals',
        title: 'Propuestas',
        type: 'basic',
        icon: 'heroicons_outline:document-text',
        link: '/proposals'
    },
    {
        id: 'admin',
        title: 'Administración',
        type: 'group',
        icon: 'heroicons_outline:cog-6-tooth',
        children: [
            {
                id: 'admin-dashboard',
                title: 'Dashboard Admin',
                type: 'basic',
                icon: 'heroicons_outline:chart-bar',
                link: '/admin/dashboard'
            },
            {
                id: 'admin-users',
                title: 'Usuarios',
                type: 'basic',
                icon: 'heroicons_outline:users',
                link: '/admin/users'
            },
            {
                id: 'admin-projects',
                title: 'Gestión de Proyectos',
                type: 'basic',
                icon: 'heroicons_outline:briefcase',
                link: '/admin/projects'
            }
        ]
    },
    {
        id: 'user',
        title: 'Usuario',
        type: 'group',
        icon: 'heroicons_outline:user',
        children: [
            {
                id: 'profile',
                title: 'Perfil',
                type: 'basic',
                icon: 'heroicons_outline:user-circle',
                link: '/profile'
            }
        ]
    }
];

export const futuristicNavigation: FuseNavigationItem[] = [
    {
        id: 'dashboard',
        title: 'Dashboard',
        type: 'basic',
        icon: 'heroicons_outline:home',
        link: '/dashboard'
    },
    {
        id: 'projects',
        title: 'Proyectos',
        type: 'basic',
        icon: 'heroicons_outline:briefcase',
        link: '/projects'
    },
    {
        id: 'proposals',
        title: 'Propuestas',
        type: 'basic',
        icon: 'heroicons_outline:document-text',
        link: '/proposals'
    },
    {
        id: 'admin',
        title: 'Administración',
        type: 'group',
        icon: 'heroicons_outline:cog-6-tooth',
        children: [
            {
                id: 'admin-dashboard',
                title: 'Dashboard Admin',
                type: 'basic',
                icon: 'heroicons_outline:chart-bar',
                link: '/admin/dashboard'
            },
            {
                id: 'admin-users',
                title: 'Usuarios',
                type: 'basic',
                icon: 'heroicons_outline:users',
                link: '/admin/users'
            },
            {
                id: 'admin-projects',
                title: 'Gestión de Proyectos',
                type: 'basic',
                icon: 'heroicons_outline:briefcase',
                link: '/admin/projects'
            }
        ]
    },
    {
        id: 'user',
        title: 'Usuario',
        type: 'group',
        icon: 'heroicons_outline:user',
        children: [
            {
                id: 'profile',
                title: 'Perfil',
                type: 'basic',
                icon: 'heroicons_outline:user-circle',
                link: '/profile'
            }
        ]
    }
];

export const horizontalNavigation: FuseNavigationItem[] = [
    {
        id: 'dashboard',
        title: 'Dashboard',
        type: 'basic',
        icon: 'heroicons_outline:home',
        link: '/dashboard'
    },
    {
        id: 'projects',
        title: 'Proyectos',
        type: 'basic',
        icon: 'heroicons_outline:briefcase',
        link: '/projects'
    },
    {
        id: 'proposals',
        title: 'Propuestas',
        type: 'basic',
        icon: 'heroicons_outline:document-text',
        link: '/proposals'
    },
    {
        id: 'admin',
        title: 'Administración',
        type: 'group',
        icon: 'heroicons_outline:cog-6-tooth',
        children: [
            {
                id: 'admin-dashboard',
                title: 'Dashboard Admin',
                type: 'basic',
                icon: 'heroicons_outline:chart-bar',
                link: '/admin/dashboard'
            },
            {
                id: 'admin-users',
                title: 'Usuarios',
                type: 'basic',
                icon: 'heroicons_outline:users',
                link: '/admin/users'
            },
            {
                id: 'admin-projects',
                title: 'Gestión de Proyectos',
                type: 'basic',
                icon: 'heroicons_outline:briefcase',
                link: '/admin/projects'
            }
        ]
    },
    {
        id: 'user',
        title: 'Usuario',
        type: 'group',
        icon: 'heroicons_outline:user',
        children: [
            {
                id: 'profile',
                title: 'Perfil',
                type: 'basic',
                icon: 'heroicons_outline:user-circle',
                link: '/profile'
            }
        ]
    }
];
