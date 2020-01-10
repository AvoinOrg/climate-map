import { enablePrivateDatasets } from './layers/private/common'
import { sha256 } from 'js-sha256';

const claimHashes = {
    valio: '75e3e7c68bffb0efc8f893345bfe161f77175b8f9ce31840db93ace7fa46f3db',
}

const initAuth = function(claims = []) {
    let idToken;
    let accessToken;
    let expiresAt;

    function isAuthenticated() {
        // Check whether the current time is past the
        // Access Token's expiry time
        const expiration = parseInt(expiresAt, 10) || 0;
        return localStorage.getItem('isLoggedIn') === 'true' && new Date().getTime() < expiration;
    }

    function displayButtons() {
        const auth = isAuthenticated();
        loginBtn.hidden = auth
        logoutBtn.hidden = !auth
    }

    function handleAuthentication() {
        webAuth.parseHash(function(err, authResult) {
            if (authResult && authResult.accessToken && authResult.idToken) {
                window.location.hash = '';
                localLogin(authResult);
            } else if (err) {
                console.log('ERROR in webAuth.parseHash:', err);
            }
            displayButtons();
        });
    }

    function localLogin(authResult) {
        const payload = authResult.idTokenPayload

        const roles = payload['https://map.buttonprogram.org/roles'] || [];
        enablePrivateDatasets(roles);

        // Set isLoggedIn flag in localStorage
        localStorage.setItem('isLoggedIn', 'true');
        // Set the time that the access token will expire at
        expiresAt = JSON.stringify(
            authResult.expiresIn * 1000 + new Date().getTime()
        );
        accessToken = authResult.accessToken;
        idToken = authResult.idToken;

        localStorage.setItem('authResult', JSON.stringify(authResult));

        displayButtons();
    }

    function renewTokens(authorizeParams1) {
        const authResult = JSON.parse(localStorage.getItem('authResult'));

        if (authResult) {
            localLogin(authResult);
            if (isAuthenticated()) return;
        }

        webAuth.checkSession(authorizeParams1, (err, authResult1) => {
            if (authResult1 && authResult1.accessToken && authResult1.idToken) {
                localLogin(authResult1);
            } else if (err) {
                console.log('webAuth.checkSession: Could not get a new token', err.error, err.error_description);
                logout();
            }
        });
    }

    function logout() {
        // Remove isLoggedIn flag from localStorage
        localStorage.removeItem('authResult');
        localStorage.removeItem('isLoggedIn');
        // Remove tokens and expiry time
        accessToken = '';
        idToken = '';
        expiresAt = 0;

        displayButtons();
    }

    // @ts-ignore External dependency
    const webAuth = new auth0.WebAuth({
        domain: process.env.AUTH0_DOMAIN,
        clientID: process.env.AUTH0_CLIENT_ID,
        responseType: 'token id_token',
        scope: 'openid email',
        redirectUri: window.location.href
    });

    const loginBtn = document.getElementById('btn-login');
    const logoutBtn = document.getElementById('btn-logout');

    if (!loginBtn) return // A version without login

    const authorizeParams = claims.length > 0 ? { roleclaims: claims } : {};
    loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        webAuth.authorize(authorizeParams);
    });

    logoutBtn.addEventListener('click', logout);

    if (localStorage.getItem('isLoggedIn') === 'true') {
        renewTokens(authorizeParams);
    } else {
        handleAuthentication();
    }
    displayButtons();
}

interface IHashParams {
    codes?: string
}
const initAuthWithClaims = function() {
    const hashParams: IHashParams = location.hash.replace(/^[#?]*/, '').split('&').reduce((prev, item) => (
        Object.assign({ [item.split('=')[0]]: item.split('=')[1] }, prev)
    ), {});

    if (!hashParams || !hashParams.codes) return initAuth();

    const claims = hashParams.codes.split(',');
    let claimsOK = 0;
    claims.forEach(claim => {
        const key = claim.split('-')[0];
        if (sha256(claim) === claimHashes[key]) { claimsOK++; }
    })
    if (claims.length === claimsOK) {
        window.location.hash = '';
        initAuth(claims);
    } else {
        window.alert(`Invalid codes for private datasets: ${claims.join(", ")}`);
    }
}

window.addEventListener('load', initAuthWithClaims);
