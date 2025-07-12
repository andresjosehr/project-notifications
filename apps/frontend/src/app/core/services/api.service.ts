import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface Project {
    id: number;
    title: string;
    description: string;
    platform: 'workana' | 'upwork';
    price?: string;
    currency?: string;
    category?: string;
    skills?: string;
    link: string;
    clientName?: string;
    clientCountry?: string;
    clientRating?: number;
    paymentVerified?: boolean;
    isFeatured?: boolean;
    isMaxProject?: boolean;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface User {
    id: number;
    email: string;
    role: 'USER' | 'ADMIN';
    isActive: boolean;
    telegramUser?: string;
    proposalDirectives?: string;
    professionalProfile?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ProjectFilters {
    search?: string;
    platform?: string;
    budget?: string;
    date?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private readonly baseUrl = environment.apiUrl || 'http://localhost:3000';

    constructor(private http: HttpClient) {}

    // =============================
    // Authentication
    // =============================

    login(credentials: { email: string; password: string }): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/api/auth/login`, credentials)
            .pipe(catchError(this.handleError));
    }

    checkInitialization(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/api/auth/check-initialization`)
            .pipe(catchError(this.handleError));
    }

    registerAdmin(userData: any): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/api/auth/register-admin`, userData)
            .pipe(catchError(this.handleError));
    }

    registerWithToken(userData: any): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/api/auth/register-with-token`, userData)
            .pipe(catchError(this.handleError));
    }

    validateToken(token: string): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/api/tokens/validate/${token}`)
            .pipe(catchError(this.handleError));
    }

    // =============================
    // Projects
    // =============================

    getProjects(filters: ProjectFilters = {}): Observable<ApiResponse<{ projects: Project[]; totalPages: number; total: number }>> {
        let params = new HttpParams();
        Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                params = params.set(key, filters[key].toString());
            }
        });

        return this.http.get<ApiResponse>(`${this.baseUrl}/api/projects/recent`, { params })
            .pipe(catchError(this.handleError));
    }

    getProjectById(id: number): Observable<ApiResponse<Project>> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/api/projects/${id}`)
            .pipe(catchError(this.handleError));
    }

    getProjectStats(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/api/stats`)
            .pipe(catchError(this.handleError));
    }

    searchProjects(query: string, platform?: string, limit?: number): Observable<ApiResponse> {
        let params = new HttpParams().set('query', query);
        if (platform) params = params.set('platform', platform);
        if (limit) params = params.set('limit', limit.toString());

        return this.http.get<ApiResponse>(`${this.baseUrl}/api/projects/search`, { params })
            .pipe(catchError(this.handleError));
    }

    // =============================
    // Users
    // =============================

    getUsers(): Observable<ApiResponse<User[]>> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/api/users`)
            .pipe(catchError(this.handleError));
    }

    getUserById(id: number): Observable<ApiResponse<User>> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/api/users/${id}`)
            .pipe(catchError(this.handleError));
    }

    updateUser(id: number, userData: any): Observable<ApiResponse> {
        return this.http.put<ApiResponse>(`${this.baseUrl}/api/users/${id}`, userData)
            .pipe(catchError(this.handleError));
    }

    deleteUser(id: number): Observable<ApiResponse> {
        return this.http.delete<ApiResponse>(`${this.baseUrl}/api/users/${id}`)
            .pipe(catchError(this.handleError));
    }

    toggleUserStatus(id: number, status: boolean): Observable<ApiResponse> {
        return this.http.patch<ApiResponse>(`${this.baseUrl}/api/users/${id}/status`, { isActive: status })
            .pipe(catchError(this.handleError));
    }

    getUserStats(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/api/users/stats`)
            .pipe(catchError(this.handleError));
    }

    getActiveUsers(): Observable<ApiResponse<User[]>> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/api/users/active`)
            .pipe(catchError(this.handleError));
    }

    // =============================
    // Tokens
    // =============================

    getTokens(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/api/tokens`)
            .pipe(catchError(this.handleError));
    }

    generateToken(): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/api/tokens/generate`, {})
            .pipe(catchError(this.handleError));
    }

    deleteToken(id: number): Observable<ApiResponse> {
        return this.http.delete<ApiResponse>(`${this.baseUrl}/api/tokens/${id}`)
            .pipe(catchError(this.handleError));
    }

    getTokenStats(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/api/tokens/stats`)
            .pipe(catchError(this.handleError));
    }

    cleanupTokens(days: number): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/api/tokens/cleanup`, { days })
            .pipe(catchError(this.handleError));
    }

    // =============================
    // Scraping
    // =============================

    scrapeSingle(options: { notifications?: boolean; parallel?: boolean } = {}): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/api/scrape/single`, options)
            .pipe(catchError(this.handleError));
    }

    scrapeWorkana(options: { notifications?: boolean } = {}): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/api/workana/scrape`, options)
            .pipe(catchError(this.handleError));
    }

    scrapeUpwork(options: { notifications?: boolean } = {}): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/api/upwork/scrape`, options)
            .pipe(catchError(this.handleError));
    }

    // =============================
    // Proposals
    // =============================

    generateProposal(data: { projectId: string; userId: string; platform?: string }): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/api/proposal/generate`, data)
            .pipe(catchError(this.handleError));
    }

    sendWorkanaProposal(data: { projectId: string; userId: number; autoLogin?: boolean; proposalContent?: string }): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/api/workana/proposal`, data)
            .pipe(catchError(this.handleError));
    }

    sendProposalWithCustomContent(projectId: string, userId: number, proposalContent: string, options: { platform?: string } = {}): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/api/proposal/send`, {
            projectId,
            userId,
            proposalContent,
            ...options
        }).pipe(catchError(this.handleError));
    }

    // =============================
    // Workana Integration
    // =============================

    loginWorkana(credentials: { email: string; password: string; userId: number }): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/api/workana/login`, credentials)
            .pipe(catchError(this.handleError));
    }

    // =============================
    // System
    // =============================

    getHealth(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/api/health`)
            .pipe(catchError(this.handleError));
    }

    getStatus(): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/api/status`)
            .pipe(catchError(this.handleError));
    }

    cleanup(): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(`${this.baseUrl}/api/cleanup`, {})
            .pipe(catchError(this.handleError));
    }

    getLogs(type: 'app' | 'error'): Observable<ApiResponse> {
        return this.http.get<ApiResponse>(`${this.baseUrl}/api/logs/${type}`)
            .pipe(catchError(this.handleError));
    }

    clearLogs(type?: 'app' | 'error'): Observable<ApiResponse> {
        const body = type ? { type } : {};
        return this.http.post<ApiResponse>(`${this.baseUrl}/api/logs/clear`, body)
            .pipe(catchError(this.handleError));
    }

    // =============================
    // Error Handling
    // =============================

    private handleError(error: any): Observable<never> {
        console.error('API Error:', error);
        
        let errorMessage = 'Ocurrió un error inesperado';
        
        if (error.error?.error) {
            errorMessage = error.error.error;
        } else if (error.error?.message) {
            errorMessage = error.error.message;
        } else if (error.message) {
            errorMessage = error.message;
        }

        return throwError(() => new Error(errorMessage));
    }
}