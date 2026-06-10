import { create } from 'zustand';

interface AuthState {
    userId: number | null;
    githubLinked: boolean;
    giteeLinked: boolean;
    githubUser: string | null;
    giteeUser: string | null;
    syncApiToken: string | null;
    setUserId: (id: number) => void;
    setLinked: (github: boolean, gitee: boolean, ghUser?: string, gtUser?: string) => void;
    setSyncApiToken: (token: string | null) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    userId: 1, // Mocking user 1 for MVP
    githubLinked: false,
    giteeLinked: false,
    githubUser: null,
    giteeUser: null,
    syncApiToken: null,
    setUserId: (id) => set({ userId: id }),
    setLinked: (github, gitee, ghUser, gtUser) => set({
        githubLinked: github,
        giteeLinked: gitee,
        githubUser: ghUser || null,
        giteeUser: gtUser || null
    }),
    setSyncApiToken: (token) => set({ syncApiToken: token }),
    logout: () => set({ userId: null, githubLinked: false, giteeLinked: false, githubUser: null, giteeUser: null, syncApiToken: null }),
}));