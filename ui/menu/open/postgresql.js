/**
 * @fileOverview
 *
 * Open from PostgreSQL
 */
KityMinder.registerUI('menu/open/postgresql', function (minder) {
    var $menu = minder.getUI('menu/menu');
    var $open = minder.getUI('menu/open/open');
    var $doc = minder.getUI('doc');
    var notice = minder.getUI('widget/notice');

    var $panel = $($open.createSub('postgresql', true)).addClass('postgresql-open-panel');

    $panel.html(
        '<div class="postgresql-open-content" style="padding: 20px; color: #333;">' +
        '<div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">' +
        '<h3 style="margin: 0;">Open from PostgreSQL</h3>' +
        '<button class="refresh-btn" style="padding: 5px 10px; cursor: pointer;">Refresh</button>' +
        '</div>' +
        '<div class="map-list" style="max-height: 400px; overflow-y: auto; border: 1px solid #ccc; background: white;"></div>' +
        '</div>'
    );

    var $mapList = $panel.find('.map-list');
    var $refreshBtn = $panel.find('.refresh-btn');

    function loadMaps() {
        $mapList.html('<div style="padding:5px;">Loading...</div>');
        $.ajax({
            url: '/api/maps',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('km_token') }
        }).then(function (maps) {
            $mapList.empty();
            if (maps.length === 0) {
                $mapList.append('<div style="padding:5px;">No saved maps found.</div>');
            } else {
                maps.forEach(function (map) {
                    var $item = $('<div class="map-item" style="cursor: pointer; padding: 10px; border-bottom: 1px solid #eee; position: relative;">' +
                        '<div class="map-title" style="font-weight:bold; font-size:14px; margin-right: 60px;"></div>' +
                        '<div style="color: #888; font-size: 12px; margin-top:5px;">Last modified: <span class="map-time"></span></div>' +
                        '<button class="delete-btn" style="position: absolute; right: 10px; top: 10px; color: red; border: none; background: none; cursor: pointer;">Delete</button>' +
                        '</div>');
                    $item.find('.map-title').text(map.title);
                    $item.find('.map-time').text(new Date(map.updated_at).toLocaleString());

                    $item.hover(function () { $(this).css('background', '#f5f5f5'); }, function () { $(this).css('background', 'white'); });

                    var $deleteBtn = $item.find('.delete-btn');
                    $deleteBtn.click(function (e) {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete "' + map.title + '"?')) {
                            $.ajax({
                                url: '/api/maps/' + map.id,
                                method: 'DELETE',
                                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('km_token') }
                            }).then(function () {
                                notice.info('Deleted successfully');
                                loadMaps();
                            }).fail(function () {
                                notice.error('Delete failed');
                            });
                        }
                    });

                    $item.click(function () {
                        if (!$doc.checkSaved()) return;

                        $menu.hide();
                        $(minder.getRenderTarget()).addClass('loading');

                        $.ajax({
                            url: '/api/maps/' + map.id,
                            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('km_token') }
                        }).then(function (res) {
                            var doc = {
                                protocol: 'json',
                                content: res.content,
                                title: res.title,
                                source: 'postgresql',
                                path: '/api/maps/' + res.id,
                                id: res.id,
                                saved: true
                            };
                            $doc.load(doc);
                        }).fail(function () {
                            notice.error('Failed to load map content');
                        }).always(function () {
                            $(minder.getRenderTarget()).removeClass('loading');
                        });
                    });

                    $mapList.append($item);
                });
            }
        }).fail(function (xhr) {
            if (xhr.status === 401 || xhr.status === 403) {
                window.location.href = 'login.html';
            } else {
                $mapList.html('<div style="color: red; padding:5px;">Failed to load maps. Ensure server is running.</div>');
            }
        });
    }

    $menu.on('show', function () {
        loadMaps();
    });

    $refreshBtn.click(loadMaps);

    return {};
});
