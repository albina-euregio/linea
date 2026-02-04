<?php
/*
Plugin Name: Iframe Shortcode for integration of LineaPlot
Description: Adds a secure [lineaplotblog] shortcode with support for long data URLs.
Version: 1.0
Author: Fynn Renner
*/

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function robust_iframe_shortcode( $atts, $content = null ) {

    $atts = shortcode_atts(
        [
            'src'         => '',
            'width'       => '100%',
            'height'      => '450',
            'scrolling'   => 'no',
            'frameborder' => '0',
            'title'       => '',
            'style'       => '',
            'loading'     => 'lazy',
            'sandbox'     => '',
        ],
        $atts,
        'lineaplotblog'
    );

    // If src attribute is empty, try shortcode body
    $src = trim( $atts['src'] );
    if ( empty( $src ) && $content ) {
        $src = trim( $content );
    }

    if ( empty( $src ) ) {
        return '';
    }

    // Allow only https or data URLs
    if ( ! preg_match( '#^(https?:|data:)#i', $src ) ) {
        return '';
    }

    $html  = '<iframe';
    $html .= ' src="' . esc_attr( $src ) . '"';
    $html .= ' width="' . esc_attr( $atts['width'] ) . '"';
    $html .= ' height="' . esc_attr( $atts['height'] ) . '"';
    $html .= ' scrolling="' . esc_attr( $atts['scrolling'] ) . '"';
    $html .= ' frameborder="' . esc_attr( $atts['frameborder'] ) . '"';
    $html .= ' loading="' . esc_attr( $atts['loading'] ) . '"';

    if ( ! empty( $atts['title'] ) ) {
        $html .= ' title="' . esc_attr( $atts['title'] ) . '"';
    }

    if ( ! empty( $atts['style'] ) ) {
        $html .= ' style="' . esc_attr( $atts['style'] ) . '"';
    }

    if ( ! empty( $atts['sandbox'] ) ) {
        $html .= ' sandbox="' . esc_attr( $atts['sandbox'] ) . '"';
    }

    $html .= ' allowfullscreen></iframe>';

    return $html;
}

add_shortcode( 'lineaplotblog', 'robust_iframe_shortcode' );