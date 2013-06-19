// ==UserScript==
// @name       Ghost Town
// @namespace    reddit.com/r/agentlame
// @description  /r/atheism - highlight everyone that voted reject.
// @include     http://www.reddit.com/r/atheism/comments/*
// @include     http://www.reddit.com/r/atheismpolicy/comments/*
// @version    0.1
// ==/UserScript==

function ghosttown() {
    console.log('running: gt');

    var contains = 'reject', //'approve',
        done = true,
        more = [],
        rejects = [],
        voteURL = 'http://www.reddit.com/r/atheism/comments/1fv01d/mod_post_official_retroactivefeedback_thread.json',
        firstRun = 1;

    if (localStorage['gt.firstRun'] !== undefined) {
        firstRun = localStorage['gt.firstRun'];
    }

    if (localStorage['gt.rejects']) {
        rejects = JSON.parse(localStorage['gt.rejects']);
    }

    if (firstRun != 0) {
        var conf = confirm('No cached votes found, would you like to get them now?\nThis could take up to 10 minutes.\nPlease do not close this page while waiting.');
        if (!conf) return;

        localStorage['gt.firstRun'] = 0;
        getVotes(voteURL);

    } else {
        init();
    }

    function init() {
        console.log('init');
        $('div.thing .entry').each(function () {
            if ($(this).hasClass('gt-processed')) {
                return;
            }
            $(this).addClass('gt-processed');

            var auth = $(this).find('.author:first').text();

            if ($.inArray(auth, rejects) !== -1) {
                $(this).css('background-color', 'lightgreen');
            }
        });
    }

    // load more comments.
    $('div.content').on('DOMNodeInserted', function (e) {
        if (e.target.parentNode.id === 'siteTable' && e.target.className.match(/sitetable/)) {
            setTimeout(function () {
                init();
            }, 1000);
        }
    });

    function getVotes(URL) {

        var html = '\
            <div class="tb-page-overlay tb-settings" comment="the white fade out over the page, we can do without, personally like it">\
            <div class="tb-vote-count" comment="the window itself">getting votes</div></div>\
        ';

        $(html).appendTo('body').show();
        $('body').css('overflow', 'hidden');
        done = false;

        $.getJSON(URL, function (json) {
            var data = json[1].data.children;

            if (!data || data.length < 1) return;

            // doesn't need a grep, but I don't want to change it.
            $.grep(data, function (t) {

                if (t.kind == 'more') {
                    more = t.data.children;
                    loadMore();
                }

                var body = (t.data.body || '').toLowerCase();

                if (contains && body.indexOf(contains.toLowerCase()) != -1) {
                    var auth = t.data.author;
                    if (auth && auth != '[deleted]' && $.inArray(auth, rejects) == -1) {
                        rejects.push(auth);
                    }
                }
            });

        })
            .error(function () {
                localStorage['gt.firstRun'] = 1;
                done = true;
                alert('error: could not get votes');
            });
    }

    function compressHTML(src) {
        return src.replace(/(\n+|\s+)?&lt;/g, '<').replace(/&gt;(\n+|\s+)?/g, '>').replace(/&amp;/g, '&').replace(/\n/g, '').replace(/child" >  False/, 'child">')
    }

    function parseMoreComment(html) {
        var auth = $(html).find('.author:first').text();
        if (auth && auth != '[deleted]' && $.inArray(auth, rejects) == -1) {
            rejects.push(auth);
        }
    }

    function loadMore() {
        var items = more.slice(0, 20).join(',');
        more.splice(0, 20);
        
        $('.tb-vote-count').text(rejects.length);
        
        console.log(rejects.length);
        console.log(items);

        if (more <= 0) {
            console.log(rejects);
            localStorage['gt.rejects'] = JSON.stringify(rejects);
            done = true;
            $('.tb-vote-count').text('votes found: ' + rejects.length);

            alert('Ding! popcorn is done.');
            return;
        }

        $.post('/api/morechildren/', {
            children: items,
            link_id: 't3_1fv01d',
            sort: 'top',
            api_type: 'json',
            uh: reddit.modhash
        })
            .success(function (d) {
                $(d.json.data.things).each(function () {

                    var text = (this.data.contentText || '').toLowerCase();

                    if (contains && text.indexOf(contains.toLowerCase()) != -1) {
                        parseMoreComment(compressHTML(this.data.content));
                    }
                });

                loadMore();

            })
            .error(function () {
                localStorage['gt.firstRun'] = 1;
                done = true;
                alert('error: could not get more results.');
            });
    }

    window.onbeforeunload = function () {
        if (!done) {
            localStorage['gt.firstRun'] = 1;
            console.log('leaving');
        }
    };
}

// Add scripts to page
(function () {

    // CSS
    var css = '\
   .tb-page-overlay {\
        padding: 10px 15px;\
        background-color: rgba(250, 250, 250, 0.84);\
        border: 0px;\
        border-radius: 0px;\
        position: fixed;\
        top: 0px;\
        left: 0px;\
        right: 0px;\
        bottom: 0px;\
        overflow: auto;\
        z-index: 10000;\
        }\
    .tb-vote-count {\
        position: relative;\
        top: 40px;\
        max-width: 250px;\
        margin: 0 auto;\
        padding: 3px;\
        background-color: #FFF;\
        border: solid 1px #808080;\
        box-shadow: 0px 1px 3px 1px #D6D6D6;\
        text-align: center;\
        color: Blue;\
        font-size: 150%;\
        }\
  ';

    // Add CSS.
    s = document.createElement('style');
    s.type = "text/css";
    s.textContent = css;
    document.head.appendChild(s);

    // Add settings
    var m = document.createElement('script');
    m.textContent = "(" + ghosttown.toString() + ')();';
    document.head.appendChild(m);

})();
