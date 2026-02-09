<?php
/*
Plugin Name: Iframe Shortcode for integration of LineaPlot
Description: Adds a shortcode [lineaplotblog] to render base64-encoded HTML
Version: 1.2
Author: Fynn Renner
*/

if ( ! defined( 'ABSPATH' ) ) {
    exit;
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

    $html  = '<div style="position: relative; width: 100%; height: ' . esc_attr( $atts['height'] ) . ';">';
    $html .= $decodedData;
    $html .= '</div>';

    return $html;
}

add_shortcode( 'lineaplotblog', 'lineaplotblog_shortcode' );
