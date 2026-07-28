(function (wp, config) {
    if (!wp || !config) {
        return;
    }

    const { registerPlugin } = wp.plugins;
    const { PluginSidebar } = wp.editPost;
    const { PanelBody, Button, SelectControl, Notice, Spinner } = wp.components;
    const { createElement: el, useEffect, useState } = wp.element;
    const { createBlock } = wp.blocks;
    const { dispatch } = wp.data;

    function request(action, values) {
        const body = new URLSearchParams({ action: action, nonce: config.nonce, ...values });
        return window.fetch(config.ajaxUrl, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: body.toString()
        }).then(function (response) {
            return response.json();
        }).then(function (response) {
            if (!response.success) {
                throw new Error(response.data && response.data.message ? response.data.message : 'The request failed.');
            }
            return response.data || {};
        });
    }

    function Sidebar() {
        const [connected, setConnected] = useState(Boolean(config.connected));
        const [galleries, setGalleries] = useState([]);
        const [selectedGallery, setSelectedGallery] = useState('');
        const [loading, setLoading] = useState(false);
        const [message, setMessage] = useState('');
        const [error, setError] = useState('');

        const loadGalleries = function () {
            setLoading(true);
            setError('');
            return request('smi_get_galleries', {}).then(function (data) {
                setGalleries(data.galleries || []);
                setSelectedGallery(data.galleries && data.galleries.length ? data.galleries[0].uri : '');
            }).catch(function (requestError) {
                setError(requestError.message);
            }).finally(function () {
                setLoading(false);
            });
        };

        useEffect(function () {
            if (connected) {
                loadGalleries();
            }
        }, [connected]);

        useEffect(function () {
            const receiveConnection = function (event) {
                if (event.origin !== config.apiOrigin || !event.data || event.data.type !== 'smugmug-auth') {
                    return;
                }

                setLoading(true);
                setError('');
                request('smi_save_connection', {
                    accessToken: event.data.accessToken || '',
                    accessSecret: event.data.accessSecret || '',
                    nickname: event.data.nickname || ''
                }).then(function () {
                    setConnected(true);
                    setMessage('Connected to SmugMug.');
                }).catch(function (requestError) {
                    setError(requestError.message);
                }).finally(function () {
                    setLoading(false);
                });
            };
            window.addEventListener('message', receiveConnection);
            return function () { window.removeEventListener('message', receiveConnection); };
        }, []);

        const connect = function () {
            setError('');
            const popup = window.open(config.apiBase + '/api/login?origin=' + encodeURIComponent(window.location.origin), 'smugmug-oauth', 'width=620,height=720');
            if (!popup) {
                setError('Your browser blocked the SmugMug sign-in window. Allow pop-ups and try again.');
            }
        };

        const disconnect = function () {
            request('smi_disconnect', {}).then(function () {
                setConnected(false);
                setGalleries([]);
                setSelectedGallery('');
                setMessage('Disconnected from SmugMug.');
            }).catch(function (requestError) {
                setError(requestError.message);
            });
        };

        const importGallery = function () {
            if (!selectedGallery) {
                return;
            }
            setLoading(true);
            setError('');
            setMessage('');
            request('smi_get_images', { albumUri: selectedGallery }).then(function (data) {
                const images = data.images || [];
                if (!images.length) {
                    throw new Error('This gallery has no importable images.');
                }
                const blocks = [];
                images.forEach(function (image) {
                    blocks.push(createBlock('core/image', {
                        url: image.url,
                        alt: image.title || image.filename || '',
                        caption: image.caption || ''
                    }));
                    blocks.push(createBlock('core/paragraph', {}));
                });
                dispatch('core/block-editor').insertBlocks(blocks);
                setMessage(images.length + ' images imported into this post.');
            }).catch(function (requestError) {
                setError(requestError.message);
            }).finally(function () {
                setLoading(false);
            });
        };

        const galleryOptions = [{ label: 'Choose a gallery', value: '' }].concat(galleries.map(function (gallery) {
            return { label: gallery.title + (gallery.imageCount ? ' (' + gallery.imageCount + ')' : ''), value: gallery.uri };
        }));

        return el(PluginSidebar, { name: 'smugmug-importer', title: 'SmugMug', icon: 'format-gallery' },
            el(PanelBody, { title: 'SmugMug Importer', initialOpen: true },
                error && el(Notice, { status: 'error', isDismissible: true, onRemove: function () { setError(''); } }, error),
                message && el(Notice, { status: 'success', isDismissible: true, onRemove: function () { setMessage(''); } }, message),
                loading && el(Spinner),
                !connected && el(Button, { variant: 'primary', onClick: connect, disabled: loading }, 'Connect to SmugMug'),
                connected && el('div', null,
                    el('p', null, 'Choose a gallery. Every image will be inserted into the current post, followed by a blank paragraph.'),
                    el(SelectControl, { label: 'Gallery', value: selectedGallery, options: galleryOptions, onChange: setSelectedGallery, disabled: loading }),
                    el(Button, { variant: 'primary', onClick: importGallery, disabled: loading || !selectedGallery }, 'Import gallery'),
                    el(Button, { variant: 'tertiary', onClick: loadGalleries, disabled: loading }, 'Refresh galleries'),
                    el(Button, { variant: 'tertiary', isDestructive: true, onClick: disconnect, disabled: loading }, 'Disconnect')
                )
            )
        );
    }

    registerPlugin('smugmug-importer', { render: Sidebar });
})(window.wp, window.SmugMugImporter);
