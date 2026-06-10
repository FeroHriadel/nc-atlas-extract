import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';



export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth   = inject(AuthService);
    const router = inject(Router);

    return from(auth.getAccessToken()).pipe(
        switchMap(token => {
            const authReq = token
                ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
                : req;
            return next(authReq);
        }),
        catchError(err => {
            if (err instanceof HttpErrorResponse && err.status === 401) {
                auth.signOut();
                router.navigate(['/login']);
            }
            return throwError(() => err);
        })
    );
};
