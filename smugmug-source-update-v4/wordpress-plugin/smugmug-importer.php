<?php
/**
 * Plugin Name: SmugMug Importer
 * Description: Import every image from a SmugMug gallery into the current post as Gutenberg image blocks.
 * Version: 1.0.1
 * Author: Noah Prince
 */

if (!defined('ABSPATH')) {
    exit;
}

define('SMI_OPTION_API_BASE', 'smi_api_base');

function smi_api_base() {
    return untrailingslashit(get_option(SMI_OPTION_API_BASE, 'https://smugmug-wordpress-tool.vercel.app'));
}

function smi_current_credentials() {
    $user_id = get_current_user_id();

    return array(
        'access_token' => get_user_meta($user_id, 'smi_access_token', true),
        'access_secret' => get_user_meta($user_id, 'smi_access_secret', true),
        'nickname' => get_user_meta($user_id, 'smi_nickname', true),
    );
}

function smi_require_editor_request() {
    if (!current_user_can('edit_posts')) {
        wp_send_json_error(array('message' => 'You do not have permission to import images.'), 403);
    }

    check_ajax_referer('smi_editor', 'nonce');
}

function smi_api_request($path, $payload = array()) {
    $credentials = smi_current_credentials();

    if (!$credentials['access_token'] || !$credentials['access_secret']) {
        return new WP_Error('smi_not_connected', 'Connect to SmugMug before importing.');
    }

    $response = wp_remote_post(smi_api_base() . '/api/' . ltrim($path, '/'), array(
        'timeout' => 60,
        'headers' => array(
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'X-SmugMug-Access-Token' => $credentials['access_token'],
            'X-SmugMug-Access-Secret' => $credentials['access_secret'],
        ),
        'body' => wp_json_encode($payload),
    ));

    if (is_wp_error($response)) {
        return $response;
    }

    $status = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if ($status < 200 || $status >= 300 || !is_array($body)) {
        return new WP_Error('smi_api_error', is_array($body) && !empty($body['error']) ? $body['error'] : 'SmugMug could not complete this request.');
    }

    return $body;
}

function smi_ajax_save_connection() {
    smi_require_editor_request();

    $access_token = sanitize_text_field(wp_unslash($_POST['accessToken'] ?? ''));
    $access_secret = sanitize_text_field(wp_unslash($_POST['accessSecret'] ?? ''));
    $nickname = sanitize_text_field(wp_unslash($_POST['nickname'] ?? ''));

    if (!$access_token || !$access_secret) {
        wp_send_json_error(array('message' => 'SmugMug did not return complete connection details.'), 400);
    }

    update_user_meta(get_current_user_id(), 'smi_access_token', $access_token);
    update_user_meta(get_current_user_id(), 'smi_access_secret', $access_secret);
    if ($nickname) {
        update_user_meta(get_current_user_id(), 'smi_nickname', $nickname);
    }
    wp_send_json_success(array('nickname' => $nickname));
}
add_action('wp_ajax_smi_save_connection', 'smi_ajax_save_connection');

function smi_ajax_disconnect() {
    smi_require_editor_request();
    delete_user_meta(get_current_user_id(), 'smi_access_token');
    delete_user_meta(get_current_user_id(), 'smi_access_secret');
    delete_user_meta(get_current_user_id(), 'smi_nickname');
    wp_send_json_success();
}
add_action('wp_ajax_smi_disconnect', 'smi_ajax_disconnect');

function smi_ajax_start_connection() {
    smi_require_editor_request();
    $state = wp_generate_password(48, false, false);
    set_transient('smi_oauth_' . $state, get_current_user_id(), 10 * MINUTE_IN_SECONDS);
    wp_send_json_success(array(
        'state' => $state,
        'returnUrl' => admin_url('admin-ajax.php?action=smi_oauth_callback'),
    ));
}
add_action('wp_ajax_smi_start_connection', 'smi_ajax_start_connection');

function smi_ajax_connection_status() {
    smi_require_editor_request();
    $credentials = smi_current_credentials();
    wp_send_json_success(array('connected' => (bool) $credentials['access_token']));
}
add_action('wp_ajax_smi_connection_status', 'smi_ajax_connection_status');

function smi_ajax_oauth_callback() {
    $state = sanitize_text_field(wp_unslash($_POST['state'] ?? ''));
    $expected_user_id = (int) get_transient('smi_oauth_' . $state);

    if (!$state || !$expected_user_id || $expected_user_id !== get_current_user_id()) {
        wp_die('This SmugMug sign-in request has expired. Close this window and try again.', 'SmugMug Importer', array('response' => 400));
    }

    $access_token = sanitize_text_field(wp_unslash($_POST['accessToken'] ?? ''));
    $access_secret = sanitize_text_field(wp_unslash($_POST['accessSecret'] ?? ''));
    $nickname = sanitize_text_field(wp_unslash($_POST['nickname'] ?? ''));
    if (!$access_token || !$access_secret) {
        wp_die('SmugMug did not return complete connection details. Close this window and try again.', 'SmugMug Importer', array('response' => 400));
    }

    update_user_meta($expected_user_id, 'smi_access_token', $access_token);
    update_user_meta($expected_user_id, 'smi_access_secret', $access_secret);
    if ($nickname) {
        update_user_meta($expected_user_id, 'smi_nickname', $nickname);
    }
    delete_transient('smi_oauth_' . $state);

    wp_die('<p>SmugMug connected. You can close this window and return to your post.</p><script>window.close();</script>', 'SmugMug connected', array('response' => 200));
}
add_action('wp_ajax_smi_oauth_callback', 'smi_ajax_oauth_callback');

function smi_ajax_get_galleries() {
    smi_require_editor_request();
    $credentials = smi_current_credentials();
    $result = smi_api_request('galleries', array('nickname' => $credentials['nickname']));

    if (is_wp_error($result)) {
        wp_send_json_error(array('message' => $result->get_error_message()), 500);
    }

    if (!empty($result['nickname'])) {
        update_user_meta(get_current_user_id(), 'smi_nickname', sanitize_text_field($result['nickname']));
    }

    wp_send_json_success(array('galleries' => $result['galleries'] ?? array()));
}
add_action('wp_ajax_smi_get_galleries', 'smi_ajax_get_galleries');

function smi_ajax_get_images() {
    smi_require_editor_request();
    $album_uri = sanitize_text_field(wp_unslash($_POST['albumUri'] ?? ''));
    $result = smi_api_request('images', array('albumUri' => $album_uri));

    if (is_wp_error($result)) {
        wp_send_json_error(array('message' => $result->get_error_message()), 500);
    }

    wp_send_json_success(array('images' => $result['images'] ?? array()));
}
add_action('wp_ajax_smi_get_images', 'smi_ajax_get_images');

function smi_enqueue_editor_assets() {
    wp_enqueue_script(
        'smugmug-importer-editor',
        plugins_url('assets/editor.js', __FILE__),
        array('wp-blocks', 'wp-components', 'wp-data', 'wp-edit-post', 'wp-element', 'wp-i18n', 'wp-plugins'),
        filemtime(plugin_dir_path(__FILE__) . 'assets/editor.js'),
        true
    );

    $api_origin = wp_parse_url(smi_api_base());
    $api_origin = !empty($api_origin['scheme']) && !empty($api_origin['host'])
        ? $api_origin['scheme'] . '://' . $api_origin['host'] . (!empty($api_origin['port']) ? ':' . $api_origin['port'] : '')
        : '';

    wp_localize_script('smugmug-importer-editor', 'SmugMugImporter', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('smi_editor'),
        'apiBase' => smi_api_base(),
        'apiOrigin' => $api_origin,
        'connected' => (bool) smi_current_credentials()['access_token'],
        'nickname' => smi_current_credentials()['nickname'],
    ));
}
add_action('enqueue_block_editor_assets', 'smi_enqueue_editor_assets');

function smi_register_admin_page() {
    add_options_page('SmugMug Importer', 'SmugMug Importer', 'manage_options', 'smugmug-importer', 'smi_render_settings_page');
}
add_action('admin_menu', 'smi_register_admin_page');

function smi_render_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    if (isset($_POST['smi_save_settings'])) {
        check_admin_referer('smi_save_settings');
        $api_base = esc_url_raw(wp_unslash($_POST['smi_api_base'] ?? ''));
        if ($api_base) {
            update_option(SMI_OPTION_API_BASE, untrailingslashit($api_base));
            echo '<div class="notice notice-success"><p>Settings saved.</p></div>';
        }
    }
    ?>
    <div class="wrap">
        <h1>SmugMug Importer</h1>
        <p>Set the URL of the deployed SmugMug API. Then open any post in the block editor and use the <strong>SmugMug</strong> sidebar.</p>
        <form method="post">
            <?php wp_nonce_field('smi_save_settings'); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="smi_api_base">API base URL</label></th>
                    <td><input class="regular-text code" id="smi_api_base" name="smi_api_base" type="url" value="<?php echo esc_attr(smi_api_base()); ?>" required></td>
                </tr>
            </table>
            <p class="submit"><button class="button button-primary" name="smi_save_settings" value="1">Save settings</button></p>
        </form>
    </div>
    <?php
}
