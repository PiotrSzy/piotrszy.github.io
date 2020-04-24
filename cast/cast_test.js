
if (false) {
    console.log("Before start");
    cast.framework.CastReceiverContext.getInstance().start();
    console.log("After start");

    cast.framework.CastReceiverContext.getInstance().setLoggerLevel(cast.framework.LoggerLevel.DEBUG);
} else {
    const context = cast.framework.CastReceiverContext.getInstance();
    const playerManager = context.getPlayerManager();
    const options = new cast.framework.CastReceiverOptions();
    playerManager.setMediaPlaybackInfoHandler((loadRequest, playbackConfig) => {
        if (loadRequest.media.metadata.customData.hasOwnProperty('drmHeaders')) {
                playbackConfig.licenseRequestHandler = requestInfo => {
                requestInfo.withCredentials = false;
                requestInfo.headers = loadRequest.media.metadata.customData.drmHeaders;
            };
        }
        if (loadRequest.media.metadata.customData.hasOwnProperty('drmLaUrl')) {
            playbackConfig.licenseUrl = loadRequest.media.metadata.customData.drmLaUrl;
        }
        if (loadRequest.media.metadata.customData.hasOwnProperty('drmKsName')) {
            playbackConfig.protectionSystem = cast.framework.ContentProtection.WIDEVINE;
            if (loadRequest.media.metadata.customData.drmKsName === 'com.microsoft.playready') {
                playbackConfig.protectionSystem = cast.framework.ContentProtection.PLAYREADY;
            }
        }
        return playbackConfig;
    })
    context.start(options);

}

