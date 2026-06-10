import { Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Card } from '../../ncss/cards/card/card.component';
import { Button } from '../../ncss/buttons/button/button.component';
import { Password } from '../../ncss/inputs/password/password.component';
import { AuthService, AuthChallenge } from '../../services/auth.service';



@Component({
    selector: 'app-login',
    templateUrl: './login.page.html',
    styleUrl: './login.page.css',
    imports: [Card, Button, Password]
})
export class LoginPage implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly router      = inject(Router);
    private readonly cdr         = inject(ChangeDetectorRef);

    protected readonly challenge = toSignal(this.authService.challenge$, { initialValue: 'none' as AuthChallenge });

    protected email       = '';
    protected password    = '';
    protected newPassword = '';
    protected isLoading   = false;
    protected error: string | null = null;

    ngOnInit(): void {
        if (this.authService.isAuthenticated) this.router.navigate(['/']);
    }

    protected async onSignIn(): Promise<void> {
        this.error = null;
        this.isLoading = true;
        this.cdr.detectChanges();
        try {
            await this.authService.signIn(this.email, this.password);
            if (this.authService.isAuthenticated) this.router.navigate(['/']);
        } catch (err: any) {
            this.error = err.message ?? 'Login failed. Please try again.';
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }

    protected async onSetNewPassword(): Promise<void> {
        this.error = null;
        this.isLoading = true;
        this.cdr.detectChanges();
        try {
            await this.authService.completeNewPassword(this.newPassword);
            this.router.navigate(['/']);
        } catch (err: any) {
            this.error = err.message ?? 'Failed to set new password.';
        } finally {
            this.isLoading = false;
            this.cdr.detectChanges();
        }
    }
}
