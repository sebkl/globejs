var globe;
var gui;

function initTweetCache() {
    lc = new THREE.Color(0x5f5fff);
    tc = new Array(180 * 2);
    for (var i = 0; i < 180 * 2; i++) {
        tc[i] = new Array(90 * 2);
    }
}

var lc;
var tc;
var callcount = 0;
var tweetcount = 0;
var maxtc = 0;
var picbuffer;
var enableImageStream = true;
var enableTweetTracking = false;

initTweetCache();

function calcPicBuffer() {
    var ret = Math.floor(($('#pics').height() / 100) * 3) + 12;
    console.log("Picbuffer: " + ret);
    return ret;
}

function Next() {
    var startcall = new Date().getTime()
    GOTOJS.Tweets.Next(function(messages) {
        try {
            var map = {};
            var max = 0;
            for (var i in messages) {
                var message = messages[i];
                var tweet = message.payload;

                if (tweet != null) {
                    tweetcount++;
                    var lo = tweet['long'];
                    var la = -tweet['lat'];
                    var opco = GLOBE.GEO.lookup_country(lo, la);

                    var imgs = tweet.images;

                    if (imgs != null && imgs.length > 0) {
                        if (enableImageStream) {
                            addImage(tweet.thumbnail, {
                                latitude: la,
                                longitude: lo
                            });
                        }

                        if (tweet.isnude || tweet.issensitive) {
                            globe.createSourceParticle(lo, la, [255, 128, 0]);
                        } else {
                            globe.createSourceParticle(lo, la);
                        }
                    } else if (tweet['retweet']) {
                        globe.createSourceParticle(lo, la, [255, 255, 255]);
                    } else {
                        globe.createSourceParticle(lo, la, [0, 128, 255]);
                    }

                    var x = parseInt(lo + 180);
                    var y = parseInt(la + 90);
                    if (tc[x][y] === undefined) {
                        if (enableTweetTracking) {
                            tc[x][y] = {
                                tweet: tweet,
                                count: 1,
                                pillar: globe.addDataPillar(lo, la, 1 / 1000)
                            };
                        }
                    } else {
                        tc[x][y].tweet = tweet;
                        tc[x][y].count++;
                        if (tc[x][y].count > maxtc) {
                            maxtc = tc[x][y].count;
                        }
                        tc[x][y].pillar.setData(tc[x][y].count / maxtc);
                    }

                    if (map[opco] === undefined) {
                        map[opco] = 0;
                    }
                    map[opco]++;
                    if (map[opco] > max) {
                        max = map[opco];
                    }
                }
            }
            for (var opco in map) {
                var val = map[opco] / max;
                globe.setCountryColor(opco, new THREE.Color(val * lc.r, val * lc.g, val * lc.b));
            }
            callcount++;
            endcall = new Date().getTime()
            scroll(endcall - startcall + 500);
        } catch (e) {
            console.log("Server fetch failed: ");
            console.log(e);
        }
        setTimeout(Next, 500);
    }); //TODO: make async and use callback
};

function Start() {
    console.log("Globe initialized, starting twitter stream");
    Next();
}

$(document).bind("globe:initialized", Start);

$(document).bind("country:hover", function(e, iso) {
    var w = $('#flagwidget');
    if (iso == null) {
        w.hide();
    } else {
        w.find("p").html(GLOBE.GEO.lookup_countryname(iso))
        w.addClass("flag_" + iso);
        w.show();
    }
});

$(document).bind('polar:hover', function(e, lo, la) {
    var x = parseInt(lo + 180);
    var y = parseInt(la + 90);
    var tweet = tc[x][y];
    if (tweet !== undefined) {
        tweet = tweet.tweet;
        $('#tweet').find('.sender').html("@" + tweet.sender + ": ");
        $('#tweet').find('.text').html(tweet.text);
        var imgs = tweet.images;
        var img = $('#tweet').find('img');
        if (imgs != null && imgs.length > 0) {
            img.show();
            img.attr("src", imgs[0]);
        } else {
            img.hide();

        }
        $('#tweet').find('.text').html(tweet.text);
        $('#tweet').show();
    } else {
        $('#tweet').hide();
    }
});

function onImageHover(event) {
    var la = $(this).attr('lat');
    var lo = $(this).attr('long');
    globe.moveToPolar(lo, la);
}

function addImage(l, o) {
    var im;
    var ni;
    if (l !== undefined && l) {
        im = $('<img>').addClass('picture').attr('src', l).attr("long", o.longitude).attr("lat", o.latitude).mouseenter(onImageHover);
        ni = $('<div>').addClass("piccont").append(im);
    } else {
        ni = $('<div>').addClass("piccont");
    }
    $('#pics').append(ni);
}

function disableTweetTracking() {
    initTweetCache();
    globe.clearPillars();
    enableTweetTeacking = false;
}


function clearImageBuffer() {
    for (var i = 0; i < picbuffer; i++) {
        addImage(null);
    }
}

function disableImageStream() {
    clearImageBuffer();
    enableImageStream = false;
}

function scroll(time) {
    var imgs = $("#pics").find('.piccont');
    var tr = Math.round((imgs.length - picbuffer) / 3);
    if (tr >= 1) {
        var easing = "linear";

        if (tr < 5) {
            tr = 1
        } else {
            tr = tr - 3
        }

        var mo = tr * 100;
        $('#pics').animate({
            top: "-=" + mo
        }, time, easing, function() {
            $('#pics').css('top', '-100px');
            for (var i = 0; i < tr; i++) {
                $($('#pics .piccont')[0]).remove()
                $($('#pics .piccont')[0]).remove()
                $($('#pics .piccont')[0]).remove()
                    //$('#pics').find('.piccont')[0].remove();
            }
        });
    }
}

$('#menuhandle').mouseenter(function(event, args) {
    console.log("int");
    $('#menu').animate({
        left: "0%",
        opacity: 0.8
    }, 300, function() {});
})

$('#menuhandle').mouseleave(function(event, args) {
    console.log("out");
    $('#menu').animate({
        left: "-100%",
        opacity: 0.1
    }, 300, function() {});
})

$(window).resize(function() {
    picbuffer = calcPicBuffer();
});

function updateButtons() {
    if (enableTweetTracking) {
        $('#tweets_button').addClass('button-flat-primary');
        $('#tweets_button').removeClass('button-flat');
    } else {
        $('#tweets_button').addClass('button-flat');
        $('#tweets_button').removeClass('button-flat-primary');
        disableTweetTracking();
    }

    if (enableImageStream) {
        clearImageBuffer();
        $('#image_button').addClass('button-flat-primary');
        $('#image_button').removeClass('button-flat');
    } else {
        $('#image_button').addClass('button-flat');
        $('#image_button').removeClass('button-flat-primary');
        disableImageStream();
    }
}

$(document).ready(function() {
    globe = GLOBE.TYPES.Globe('#container');
    globe.start();
    GLOBE.WIDGETS.renderShareBar('#sharebar');
    GLOBE.WIDGETS.renderFlagWidget('#flagwidget');
    picbuffer = calcPicBuffer();

    updateButtons();

    $('#image_button').click(function(event) {
        enableImageStream = !enableImageStream;
    });

    $('#tweets_button').click(function(event) {
        enableTweetTracking = !enableTweetTracking;
        updateButtons();
    });
});
