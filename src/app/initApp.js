// File: src/app/initApp.js
import { renderLogin } from '../auth/login.js';
import { renderAppLayout } from './renderAppLayout.js';
import { appState } from '../state/appState.js';
import { startSessionTimer, setupActivityListeners } from '../utils/session.js';
import { authenticateUser } from '../db/firebase-config.js';
import { dataService } from '../services/dataService.js';

/**
 * Handles the application's initial rendering based on user authentication status.
 */
export async function initApp() {
    try {
        await authenticateUser();
        await dataService.init();

        const session = JSON.parse(localStorage.getItem('currentSession'));

        if (session && session.sessionExpiry > Date.now()) {
            const userExists = (await dataService.get('users'))
                .some(u => u.username === session.username);
            
            if (userExists) {
                appState.currentUser = session;
                startSessionTimer();
                setupActivityListeners();
                return renderAppLayout();
            }
        }

        // If no valid session exists, always render the login page.
        // The registration link can be provided on the login page.
        localStorage.removeItem('currentSession');
        appState.currentUser = null;
        return renderLogin();

    } catch (err) {
        console.error("App failed to initialize:", err);
    }
}
