<?php
/*
Plugin Name: Iframe Shortcode for integration of LineaPlot
Description: Adds a shortcode [lineaplotblog] to render base64-encoded HTML
Version: 2.0
Author: Fynn Renner
*/

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

const LINEAPLOTBLOG_IMAGE_TYPES = [
    'image/png'  => 'png',
    'image/jpeg' => 'jpg',
    'image/webp' => 'webp',
];

/**
 * Stores a base64 encoded image in uploads/lineaplot/ and returns its public URL.
 * The file name is the content hash, so every image is written only once.
 */
function lineaplotblog_store_image( string $mime, string $base64 ): ?string {
    $binary = base64_decode( preg_replace( '/\s+/', '', $base64 ), true );
    if ( $binary === false ) {
        return null;
    }
    $info = @getimagesizefromstring( $binary );
    if ( $info === false || $info['mime'] !== $mime ) {
        return null;
    }

    $uploads = wp_upload_dir( null, false ); // do not create the year/month directory
    if ( ! empty( $uploads['error'] ) ) {
        error_log( 'LineaPlot shortcode: ' . $uploads['error'] );
        return null;
    }
    $filename = sha1( $binary ) . '.' . LINEAPLOTBLOG_IMAGE_TYPES[ $mime ];
    $dir      = $uploads['basedir'] . '/lineaplot';
    $path     = $dir . '/' . $filename;

    if ( ! file_exists( $path ) ) {
        // write to a temporary file and rename it, so concurrent requests never serve a partial file
        $tmp = $path . '.' . uniqid( '', true ) . '.tmp';
        if ( ! wp_mkdir_p( $dir ) || file_put_contents( $tmp, $binary ) === false || ! rename( $tmp, $path ) ) {
            @unlink( $tmp );
            error_log( 'LineaPlot shortcode: Could not write ' . $path );
            return null;
        }
    }
    return set_url_scheme( $uploads['baseurl'] . '/lineaplot/' . $filename );
}

/**
 * Replaces inline data URLs of images by files in the uploads directory,
 * as newsletter tools (e.g. rapidmail) and many mail clients reject data URLs.
 *
 * @param string[] $urls receives the sources of all images: the URL of the stored file,
 *                      or the original data URL if the image could not be stored
 */
function lineaplotblog_externalize_images( string $html, array &$urls ): string {
    // only store files for authors who may upload media anyway
    $post      = get_post();
    $may_store = $post !== null && user_can( (int) $post->post_author, 'upload_files' );

    $types = implode( '|', array_map( 'preg_quote', array_keys( LINEAPLOTBLOG_IMAGE_TYPES ) ) );
    return preg_replace_callback(
        '#\bsrc=(["\'])data:(' . $types . ');base64,([A-Za-z0-9+/=\s]+)\1#',
        function ( $m ) use ( &$urls, $may_store ) {
            $url = $may_store ? lineaplotblog_store_image( $m[2], $m[3] ) : null;
            if ( $url === null ) {
                $urls[] = 'data:' . $m[2] . ';base64,' . preg_replace( '/\s+/', '', $m[3] );
                return $m[0];
            }
            $urls[] = $url;
            return 'src="' . esc_url( $url ) . '"';
        },
        $html
    );
}

function lineaplotblog_shortcode( $atts, $content = null ) {

    $atts = shortcode_atts(
        [
            'height' => '450px',
            'title'  => ''
        ],
        $atts,
        'lineaplotblog'
    );

    if ( empty( $content ) ) {
        return '';
    }

    // Remove accidental spaces in base64 which can come from JavaScripts dataurls
    // see https://www.php.net/manual/en/function.base64-decode.php
    $encodedData = str_replace(' ', '+', trim($content));

    if ( str_starts_with($encodedData, 'data:text/html;base64,') ) {
        $encodedData = substr($encodedData, strlen('data:text/html;base64,'));
    }

    $decodedData = base64_decode($encodedData, true);

    if ( $decodedData === false ) {
        error_log( 'LineaPlot shortcode: Base64 decode failed. Content: ' . substr($encodedData, 0, 100) . '...' );
        return '<!-- Invalid base64 content -->';
    }

    $imageUrls   = [];
    $decodedData = lineaplotblog_externalize_images( $decodedData, $imageUrls );

    /**
     * Whether to render only the static image (and caption) instead of the interactive element,
     * e.g. for feeds consumed by newsletters, where custom elements cannot be displayed.
     */
    if ( apply_filters( 'lineaplotblog_static_only', is_feed(), $atts ) ) {
        if ( empty( $imageUrls ) ) {
            return '';
        }
        // the blog export renders all plots into a single image
        $src     = $imageUrls[0];
        $caption = '';
        if ( preg_match( '#<p class="wp-element-caption">(.*?)</p>#s', $decodedData, $m ) ) {
            $caption = '<figcaption class="wp-element-caption">' . $m[1] . '</figcaption>';
        }
        return '<figure class="wp-block-image">'
            . '<img src="' . esc_url( $src, array_merge( wp_allowed_protocols(), [ 'data' ] ) ) . '" alt="' . esc_attr( $atts['title'] ) . '"'
            . ' style="display: block; width: 100%; max-width: 100%; height: auto;"/>'
            . $caption
            . '</figure>';
    }

    $html  = '<div style="position: relative; width: 100%; height: ' . esc_attr( $atts['height'] ) . ';">';
    $html .= $decodedData;
    $html .= '</div>';

    return $html;
}

add_shortcode( 'lineaplotblog', 'lineaplotblog_shortcode' );
