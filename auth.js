const claimHashes = {
    valio: '75e3e7c68bffb0efc8f893345bfe161f77175b8f9ce31840db93ace7fa46f3db',
}

function hexString(buffer) {
    const byteArray = new Uint8Array(buffer);

    const hexCodes = [...byteArray].map(value => {
      const hexCode = value.toString(16);
      const paddedHexCode = hexCode.padStart(2, '0');
      return paddedHexCode;
    });

    return hexCodes.join('');
  }

const sha256hex = (text, callback) =>
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(
        digest => callback(hexString(digest))
    )

const verifyClaimHash = (text, callback) => {
    const key = text.split('-')[0]
    sha256hex(text, x => callback(x === claimHashes[key]))
};

const verifyClaims = (claims, callback) => {
    // Super hacky. Too lazy to load a proper async/promise library etc.
    let numLeft = claims.length;
    let numSuccess = 0;
    claims.forEach(claim => {
        verifyClaimHash(claim, (result) => {
            numLeft--;
            numSuccess += result
            if (numLeft === 0) return callback(numSuccess === claims.length);
        })
    })
};

window.initAuthWithClaims = function() {
    const hashParams = location.hash.replace(/^[#?]*/, '').split('&').reduce((prev, item) => (
        Object.assign({ [item.split('=')[0]]: item.split('=')[1] }, prev)
    ), {});

    if (!hashParams || !hashParams.codes) return window.initAuth();

    const claims = hashParams.codes.split(',')
    verifyClaims(claims, result => {
        if (result) {
            window.location.hash = '';
            window.initAuth(claims);
        }
        else alert(`Invalid codes for private datasets: ${claims.join(", ")}`);
    })
}

window.initAuth = function(claims) {
    let idToken;
    let accessToken;
    let expiresAt;

    const webAuth = new auth0.WebAuth({
        domain: AUTH0_DOMAIN,
        clientID: AUTH0_CLIENT_ID,
        responseType: 'token id_token',
        scope: 'openid email',
        redirectUri: window.location.href
    });

    const loginBtn = document.getElementById('btn-login');
    const logoutBtn = document.getElementById('btn-logout');

    const authorizeParams = {roleclaims: claims};
    loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        webAuth.authorize(authorizeParams);
    });

    logoutBtn.addEventListener('click', logout);

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

        const roles = payload['https://map.buttonprogram.org/roles']
        window.enablePrivateDatasets(roles);

        // Set isLoggedIn flag in localStorage
        localStorage.setItem('isLoggedIn', 'true');
        // Set the time that the access token will expire at
        expiresAt = JSON.stringify(
            authResult.expiresIn * 1000 + new Date().getTime()
        );
        accessToken = authResult.accessToken;
        idToken = authResult.idToken;

        localStorage.setItem('authResult', JSON.stringify(authResult));
    }

    function renewTokens() {
        const authResult = JSON.parse(localStorage.getItem('authResult'));

        if (authResult) {
            localLogin(authResult);
            displayButtons();
            if (isAuthenticated()) return;
        }

        webAuth.checkSession(authorizeParams, (err, authResult) => {
            if (authResult && authResult.accessToken && authResult.idToken) {
                localLogin(authResult);
            } else if (err) {
                console.log('webAuth.checkSession: Could not get a new token', err.error, err.error_description);
                logout();
            }
            displayButtons();
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

    function isAuthenticated() {
        // Check whether the current time is past the
        // Access Token's expiry time
        const expiration = parseInt(expiresAt) || 0;
        return localStorage.getItem('isLoggedIn') === 'true' && new Date().getTime() < expiration;
    }

    function displayButtons() {
        const auth = isAuthenticated();
        if (loginBtn.hidden !== auth) {
            loginBtn.toggleAttribute('hidden');
            logoutBtn.toggleAttribute('hidden');
        }
    }

    if (localStorage.getItem('isLoggedIn') === 'true') {
        renewTokens();
    } else {
        handleAuthentication();
    }
}