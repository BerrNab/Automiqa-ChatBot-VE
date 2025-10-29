import { QueryClient, QueryFunction } from "@tanstack/react-query";

// API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Determine if we need to set Content-Type header
  // Don't set it for FormData - browser will set it with boundary
  const headers: Record<string, string> = {};
  let body: any = undefined;
  
  // Add Authorization header if token exists
  const token = localStorage.getItem('access_token');
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  if (data) {
    if (data instanceof FormData) {
      // Let the browser handle the Content-Type for FormData
      body = data;
    } else {
      // For JSON data
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(data);
    }
  }

  const fullUrl = API_BASE_URL + url;
  const res = await fetch(fullUrl, {
    method,
    headers,
    body,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const fullUrl = API_BASE_URL + url;
    
    // Add Authorization header if token exists
    const headers: Record<string, string> = {};
    const token = localStorage.getItem('access_token');
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(fullUrl, {
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
