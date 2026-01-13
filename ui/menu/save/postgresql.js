/**
 * @fileOverview
 *
 * Save to PostgreSQL
 */
KityMinder.registerUI('menu/save/postgresql', function (minder) {
    var $menu = minder.getUI('menu/menu');
    var $save = minder.getUI('menu/save/save');
    var $doc = minder.getUI('doc');
    var notice = minder.getUI('widget/notice');

    var $panel = $($save.createSub('postgresql', true)).addClass('postgresql-save-panel');

    $panel.html(
        '<div class="postgresql-save-content" style="padding: 20px; color: #333;">' +
        '<h3 style="margin-top:0">Save to PostgreSQL</h3>' +
        '<div class="form-group" style="margin-bottom: 10px;">' +
        '<label style="display:block; margin-bottom:5px;">Title:</label>' +
        '<input type="text" class="fui-widget fui-selectable title-input" style="width: 100%; padding: 5px; box-sizing: border-box;">' +
        '</div>' +
        '<button class="save-button" style="padding: 5px 15px; background: #428bca; color: white; border: none; cursor: pointer;">Save</button>' +
        '<div class="map-list-container" style="margin-top: 20px;">' +
        '<h4>Existing Maps (Click to overwrite)</h4>' +
        '<div class="map-list" style="max-height: 200px; overflow-y: auto; border: 1px solid #ccc; background: white;"></div>' +
        '</div>' +
        '</div>'
    );

    var $titleInput = $panel.find('.title-input');
    var $saveBtn = $panel.find('.save-button');
    var $mapList = $panel.find('.map-list');

    function loadMaps() {
        $mapList.html('<div style="padding:5px;">Loading...</div>');
        $.get('/api/maps').then(function (maps) {
            $mapList.empty();
            if (maps.length === 0) {
                $mapList.append('<div style="padding:5px;">No saved maps found.</div>');
            } else {
                maps.forEach(function (map) {
                    var $item = $('<div class="map-item" style="cursor: pointer; padding: 5px; border-bottom: 1px solid #eee;">' +
                        '<span class="map-title" style="font-weight:bold;"></span> ' +
                        '<span style="color: #888; font-size: 12px; float: right;"></span>' +
                        '</div>');
                    $item.find('.map-title').text(map.title);
                    $item.find('span:last').text(new Date(map.updated_at).toLocaleString());

                    $item.hover(function () { $(this).css('background', '#f5f5f5'); }, function () { $(this).css('background', 'white'); });

                    $item.click(function () {
                        $titleInput.val(map.title);
                        $titleInput.data('id', map.id);
                        $titleInput.data('original-title', map.title);
                    });
                    $mapList.append($item);
                });
            }
        }).fail(function () {
            $mapList.html('<div style="color: red; padding:5px;">Failed to load maps. Ensure server is running.</div>');
        });
    }

    $menu.on('show', function () {
        var current = $doc.current();

        // Reset ID if source is not postgresql
        if (current.source !== 'postgresql') {
            $titleInput.removeData('id');
            $titleInput.val(current.title || 'Untitled');
        } else {
            $titleInput.val(current.title);
            if (current.id) {
                $titleInput.data('id', current.id);
            }
        }

        loadMaps();
    });

    $saveBtn.click(function () {
        var title = $titleInput.val();
        if (!title) {
            notice.error('Please enter a title');
            return;
        }

        var data = minder.exportJson();
        var content = JSON.stringify(data);
        var id = $titleInput.data('id');

        // Logic check: If ID is set, we are updating. 
        // If the user changed the title, effectively renaming.

        var payload = {
            title: title,
            content: content
        };

        if (id) {
            payload.id = id;
        }

        $saveBtn.prop('disabled', true).text('Saving...');

        $.ajax({
            url: '/api/maps',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload)
        }).then(function (res) {
            notice.info('Saved successfully');

            // Update current doc status
            $doc.save({
                title: res.title,
                content: res.content, // This is string
                json: res.content,
                data: JSON.parse(res.content),
                protocol: 'json',
                source: 'postgresql',
                saved: true,
                id: res.id,
                path: '/api/maps/' + res.id
            });

            // Update input data
            $titleInput.data('id', res.id);

            loadMaps();
        }).fail(function (err) {
            console.error(err);
            notice.error('Save failed!');
        }).always(function () {
            $saveBtn.prop('disabled', false).text('Save');
        });
    });

    return {};
});
