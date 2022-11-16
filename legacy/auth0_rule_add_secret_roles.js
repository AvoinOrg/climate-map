// This is the rule used in Auth0 Rules to add secrets/roles
// to user app metadata based on corresponding claims.
function(user, context, callback){

    // Roles should only be set to verified users.
    if (!user.email || !user.email_verified) {
        return callback(null, user, context);
    }

    const claimToSecret = {
        'valio-REDACTED' : 'valio-REDACTED',
    };

    user.user_metadata = user.user_metadata || {};
    user.app_metadata = user.app_metadata || {};
    user.app_metadata.roles = user.app_metadata.roles || [];

    // NB: This is the only reliable way I found to add "proper" roles/secrets.
    const roleClaims = context.request.query.roleclaims || [];

    context.idToken['https://server.avoin.org/data/map/roles'] = user.app_metadata.roles || [];

    const secrets = [];
    for (const claim in claimToSecret) {
        if (roleClaims.indexOf(claim) !== -1)
            secrets.push(claimToSecret[claim]);
    }
    if (secrets.length === 0) {
        return callback(null, user, context);
    }

    // update the app_metadata that will be part of the response
    for (const idx in secrets) {
        if (user.app_metadata.roles.indexOf(secrets[idx]) === -1)
            user.app_metadata.roles.push(secrets[idx]);
    }

    // persist the app_metadata update
    auth0.users.updateAppMetadata(user.user_id, user.app_metadata)
    .then(function(){
        context.idToken['https://server.avoin.org/data/map/roles'] = user.app_metadata.roles;
        callback(null, user, context);
    })
    .catch(function(err){
        callback(err);
    });
}
