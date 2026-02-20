import { SpotifyUser } from "@smart-spotify/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { authAPI } from "../services/api";
import { useLocation, useNavigate } from "react-router-dom";

export type AuthSource = "spotify" | "youtube";

const AUTH_SOURCE_STORAGE_KEY = "smart_spotify_auth_source";

function getStoredSource(): AuthSource {
  const value = localStorage.getItem(AUTH_SOURCE_STORAGE_KEY);
  return value === "youtube" ? "youtube" : "spotify";
}

function applyThemeForSource(source: AuthSource) {
  document.documentElement.setAttribute("data-theme", source);
}

interface AuthContextType {
  user: SpotifyUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  source: AuthSource;
  setSource: (source: AuthSource) => void;
  login: (source: AuthSource) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [source, setSourceState] = useState<AuthSource>(() =>
    getStoredSource(),
  );
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: user, isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await authAPI.getUser();
      setIsAuthenticated(true);
      return response.data;
    },
    retry: false,
    enabled: !isAuthenticated,
  });

  const logoutMutation = useMutation({
    mutationFn: () => authAPI.logout(source),
    onSuccess: () => {
      setIsAuthenticated(false);
      queryClient.clear();
      navigate("/login");
    },
  });

  const setSource = (nextSource: AuthSource) => {
    localStorage.setItem(AUTH_SOURCE_STORAGE_KEY, nextSource);
    setSourceState(nextSource);
  };

  const login = (loginSource: AuthSource) => {
    setSource(loginSource);
    authAPI.login(loginSource);
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  useEffect(() => {
    applyThemeForSource(source);
  }, [source]);

  useEffect(() => {
    if (user && location.pathname.includes("/login")) {
      navigate("/");
    }
  }, [user, location]);

  const value: AuthContextType = {
    user: user || null,
    isLoading,
    isAuthenticated,
    source,
    setSource,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
