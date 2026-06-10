import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
    CognitoUserPool,
    CognitoUser,
    AuthenticationDetails,
    CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { environment } from '../../environments/environment';



export type AuthChallenge = 'none' | 'newPasswordRequired';



@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly pool = new CognitoUserPool({
        UserPoolId: environment.cognito.userPoolId,
        ClientId:   environment.cognito.clientId,
    });

    private pendingUser: CognitoUser | null = null;

    private readonly _isAuthenticated$ = new BehaviorSubject<boolean>(false);
    public  readonly  isAuthenticated$  = this._isAuthenticated$.asObservable();

    private readonly _challenge$ = new BehaviorSubject<AuthChallenge>('none');
    public  readonly  challenge$  = this._challenge$.asObservable();

    constructor() {
        this.refreshSessionState();
    }

    get isAuthenticated(): boolean {
        return this._isAuthenticated$.getValue();
    }

    signIn(email: string, password: string): Promise<void> {
        const user = new CognitoUser({ Username: email, Pool: this.pool });
        const authDetails = new AuthenticationDetails({ Username: email, Password: password });

        return new Promise((resolve, reject) => {
            user.authenticateUser(authDetails, {
                onSuccess: () => {
                    this._isAuthenticated$.next(true);
                    this._challenge$.next('none');
                    resolve();
                },
                onFailure: (err) => reject(err),
                newPasswordRequired: () => {
                    this.pendingUser = user;
                    this._challenge$.next('newPasswordRequired');
                    resolve(); // resolve so the page can react to the challenge signal
                },
            });
        });
    }

    completeNewPassword(newPassword: string): Promise<void> {
        if (!this.pendingUser) return Promise.reject(new Error('No pending challenge'));

        return new Promise((resolve, reject) => {
            this.pendingUser!.completeNewPasswordChallenge(newPassword, {}, {
                onSuccess: () => {
                    this._isAuthenticated$.next(true);
                    this._challenge$.next('none');
                    this.pendingUser = null;
                    resolve();
                },
                onFailure: (err) => reject(err),
            });
        });
    }

    signOut(): void {
        this.pool.getCurrentUser()?.signOut();
        this._isAuthenticated$.next(false);
        this._challenge$.next('none');
        this.pendingUser = null;
    }

    getAccessToken(): Promise<string | null> {
        const user = this.pool.getCurrentUser();
        if (!user) return Promise.resolve(null);

        return new Promise((resolve) => {
            user.getSession((err: Error | null, session: CognitoUserSession | null) => {
                resolve(!err && session?.isValid() ? session.getAccessToken().getJwtToken() : null);
            });
        });
    }

    private refreshSessionState(): void {
        const user = this.pool.getCurrentUser();
        if (!user) return;
        user.getSession((err: Error | null, session: CognitoUserSession | null) => {
            this._isAuthenticated$.next(!err && !!session?.isValid());
        });
    }
}
