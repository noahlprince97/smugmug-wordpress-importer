<?php
/**
 * Plugin Name: SmugMug Importer
 * Description: Import SmugMug galleries into WordPress posts.
 * Version: 0.0.1
 * Author: Noah Prince
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('admin_menu', function () {
    add_menu_page(
        'SmugMug Importer',
        'SmugMug',
        'manage_options',
        'smugmug-importer',
        'smugmug_importer_page',
        'dashicons-format-gallery',
        30
    );
});

function smugmug_importer_page() {
?>
<div class="wrap">
    <h1>SmugMug Importer</h1>

    <p>🚧 Plugin successfully installed.</p>

    <p>This page will eventually let you:</p>

    <ol>
        <li>Connect to SmugMug</li>
        <li>Select a gallery</li>
        <li>Import every image into your post</li>
    </ol>

    <button class="button button-primary">
        Connect to SmugMug
    </button>
</div>
<?php
}
