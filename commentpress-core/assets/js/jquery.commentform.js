/*
================================================================================
CommentPress Common addComment Javascript
================================================================================
AUTHOR: Christian Wach <needle@haystack.co.uk>
--------------------------------------------------------------------------------
NOTES

This script is only included when a CommentPress Core compatible theme is active.

The moveForm() method is called by onclick attributes of the
"Reply to this comment" links, which are auto-generated by WP.

This is a rewritten version of the inbuilt WordPress addComment
object for several reasons:

(1) The built-in WordPress Javascript does not allow for the
enabling of TinyMCE, *even though* WordPress now ships with it
built-in to the Admin Interface. TinyMCE must be de-activated
before the respond div is moved, then re-enabled once the move
has been completed.

(2) There is a name clash between TinyMCE's wrapper and the
comment_parent input when comment threading is enabled. Both use
id="comment_parent", thus preventing that variable from being
posted when the form is submitted.

(3) CommentPress has a replytopara link parameter and an additional
text_signature variable which need to be accounted for. See the
moveFormToPara() method for details of the latter.

--------------------------------------------------------------------------------
*/






/**
 * Comment area handler object
 */
addComment = {



	/**
	 * Method for moving the comment form
	 *
	 * @param string commentID The CSS ID of the comment
	 * @param string parentID The CSS ID of the parent comment
	 * @param string respondID The CSS ID of the comment form
	 * @param string postID The ID of the WordPress post
	 * @param string textSig The target text signature
	 * @return false
	 */
	moveForm : function( commentID, parentID, respondID, postID, textSig ) {



		// unload tinyMCE
		this.disableForm();



		// properties
		var div_e;
		var comm_e = this.I(commentID);
		var respond_e = this.I(respondID);
		var cancel_e = this.I('cancel-comment-reply-link');
		var parent_e = this.I('comment_parent');
		var post_e = this.I('comment_post_ID');
		// get comment text signature item
		if ( this.I('text_signature') ) {
			var sig_e = this.I('text_signature');
		} else {
			var sig_e = '';
		}



		// sanity check
		if ( !comm_e || !respond_e || !cancel_e || !parent_e ) {

			// reload tinyMCE
			this.enableForm();

			// --<
			return;

		}



		// if we have them...
		if ( post_e && postID ) {

			// set comment_post_ID hidden input to postID
			post_e.value = postID;

		}

		// set comment_parent hidden input to parentID
		parent_e.value = parentID;
		//console.log( 'parent_e.value set: ' + parent_e.value );

		// set text_signature hidden input to text signature
		if ( sig_e !== '' ) { sig_e.value = textSig; }

		// store respondID for cancel method to access
		this.respondID = respondID;

		// set title
		addComment.setTitle( parentID, textSig, 'set' );



		// do we have a temp div?
		if ( !this.I('wp-temp-form-div') ) {

			// create one
			div_e = document.createElement('div');
			div_e.id = 'wp-temp-form-div';
			div_e.style.display = 'none';
			respond_e.parentNode.insertBefore( div_e, respond_e );

		}



		// insert comment response area
		comm_e.parentNode.insertBefore( respond_e, comm_e.nextSibling );



		// if not special page and we encouraging commenting and not a reply
		if ( cp_special_page != '1' && cp_promote_reading == '0' && parentID == '0' ) {

			// hide cancel link
			cancel_e.style.display = 'none';

		} else {

			// show cancel link
			cancel_e.style.display = '';

		}



		/**
		 * Method for cancel button
		 *
		 * @return false
		 */
		cancel_e.onclick = function() {

			// --<
			return addComment.cancelForm();

		}



		// test for tinyMCE
		if ( cp_tinymce == '1' ) {

			// reload tinyMCE
			this.enableForm();

		} else {

			// try and give focus to textarea - disabled since we use tinyMCE
			// except for on mobile devices, where we don't want to auto-focus
			//try { this.I('comment').focus(); }
			//catch(e) {}

		}



		// show respond element
		respond_e.style.display = 'block';



		// clear comment highlight
		addComment.clearCommentHighlight( this.parentID );

		// highlight
		addComment.highlightComment( parentID );



		// store text sig
		this.text_signature = textSig;
		this.parentID = parentID;



		// do not bubble
		return false;

	},



	/**
	 * Method for moving the comment form to a paragraph block
	 *
	 * @param string paraNum The paragraph number
	 * @param string textSig The target text signature
	 * @param string postID The ID of the WordPress post
	 * @return false
	 */
	moveFormToPara : function( paraNum, textSig, postID ) {

		// set paraID
		var paraID = 'reply_to_para-' + paraNum;

		// move the form
		addComment.moveForm(
			paraID,
			'0',
			'respond',
			postID,
			textSig
		);

		// do not bubble
		return false;

	},



	/**
	 * Reset the comment form
	 *
	 * @return false
	 */
	cancelForm : function() {

		// get our temp div element
		var temp_e = addComment.I('wp-temp-form-div');

		// get our comment response element
		var respond_e = addComment.I(addComment.respondID);

		// get cancel button
		var cancel_e = this.I('cancel-comment-reply-link');

		// sanity check
		if ( !temp_e || !respond_e ) {

			// --<
			return;

		}



		// clear comment highlight
		addComment.clearCommentHighlight( this.parentID );



		// if not special page
		if ( cp_special_page != '1' ) {

			// init text_sig
			var text_sig = '';
			var para_num = '';

			// if we have a text sig
			if ( addComment.I('text_signature') ) {

				// unset comment text signature value
				text_sig = addComment.I('text_signature').value;
				addComment.I('text_signature').value = '';

				//console.log('text_sig: '+text_sig);

				// This is a potential source of weakness: if the para text has been changed,
				// but not by much, then levenshtein will still associate the comment with
				// a paragraph, but there will be no *exact* reference in the DOM.

				// find para num
				var para_id = jQuery('#para_wrapper-' + text_sig + ' .reply_to_para').attr('id');

				// is there an element for the exact match?
				if ( 'undefined' === typeof para_id ) {

					// NO -> crawl up the DOM looking for the wrapper
					var parent_wrapper = jQuery('#respond').closest('div.paragraph_wrapper');

					// if we get it...
					if ( parent_wrapper.length > 0 ) {

						// grab it's id
						var parent_wrapper_id = parent_wrapper.attr('id');

						// proceed with this instead
						var para_id = jQuery( '#' + parent_wrapper_id + ' .reply_to_para').attr('id');

					}

				}

				// get paragraph number
				para_num = para_id.split('-')[1];

			}



			// are we encouraging reading?
			if ( cp_promote_reading == '1' ) {

				// hide respond element
				if ( respond_e.style.display != 'none' ) {
					respond_e.style.display = 'none';
				}

			} else {

				// get comment post ID
				var post_id = addComment.I('comment_post_ID').value;

				// return form to para position

				// return form to para
				addComment.moveFormToPara( para_num, text_sig, post_id );

				// do not bubble
				return false;

			}

		} else {

			//addComment.highlightComment( this.parentID );

		}



		// unload tinyMCE
		addComment.disableForm();



		// get comment post ID
		var parent_id = addComment.I('comment_parent').value;

		// unset comment parent value
		addComment.I('comment_parent').value = '0';



		// DOM manipulation
		temp_e.parentNode.insertBefore( respond_e, temp_e );
		temp_e.parentNode.removeChild( temp_e );



		// hide cancel link
		cancel_e.style.display = 'none';

		// disable this until next run
		cancel_e.onclick = null;



		// set title
		addComment.setTitle( '0', text_sig, 'cancel' );

		// clear text sig
		this.text_signature = '';

		// reload tinyMCE
		addComment.enableForm();



		// do not bubble
		return false;

	},



	/**
	 * Get element ID
	 *
	 * @param string e The element to find
	 * @return object The DOM element's ID
	 */
	I : function(e) {

		// --<
		return document.getElementById(e);

	},



	/**
	 * Enable the comment form
	 *
	 * @return void
	 */
	enableForm : function() {

		// test for tinyMCE
		if ( cp_tinymce == '1' ) {

			// test for tinyMCE version
			if ( cp_tinymce_version == '3' ) {

				// load tinyMCE up to version 3
				setTimeout( function() {
					tinyMCE.execCommand( 'mceAddControl', false, 'comment' );
					tinyMCE.execCommand( 'render' );
				}, 1 );

			} else {

				// load tinyMCE version 4
				setTimeout( function() {
					tinyMCE.execCommand( 'mceAddEditor', false, 'comment' );
					tinyMCE.execCommand( 'render' );
				}, 1 );

			}

			//console.log( 'control added' );

		}

	},


	/**
	 * Disable the comment form
	 *
	 * @return void
	 */
	disableForm : function() {

		// test for tinyMCE
		if ( cp_tinymce == '1' ) {

			// test for tinyMCE version
			if ( cp_tinymce_version == '3' ) {

				// unload tinyMCE up to version 3
				tinyMCE.execCommand( 'mceRemoveControl', false, 'comment' );

			} else {

				// unload tinyMCE version 4
				tinyMCE.execCommand( 'mceRemoveEditor', false, 'comment' );

			}

			//console.log( 'control removed' );

		}

	},



	/**
	 * Set the comment form title
	 *
	 * @param string parentID The CSS ID of the parent element
	 * @param string textSig The text signature
	 * @param string mode The mode (eg, 'cancel')
	 * @return void
	 */
	setTitle : function( parentID, textSig, mode ) {

		//console.log( 'parentID: '+parentID+' textSig: '+textSig+' mode: ' + mode );

		// get comment form title item
		var title = addComment.I('respond_title');

		// is it a comment reply?
		if ( 'undefined' === typeof parentID || parentID == '0' ) {

			// NO -> is it a comment on the whole page?
			if ( 'undefined' === typeof textSig || textSig == '' ) {

				// if special page
				if ( cp_special_page == '1' ) {

					// restore
					title.innerHTML = 'Leave a comment';

				} else {

					// restore
					//title.innerHTML = 'Comment on the page';
					title.innerHTML = jQuery( '#para_wrapper-' + textSig + ' a.reply_to_para' ).text();

					// get comment list
					var comment_list = jQuery( '#para_wrapper-' + addComment.text_signature + ' .commentlist' );

					// if we have a comment list...
					if ( comment_list[0] && cp_promote_reading == '0' ) {
						jQuery( '#para_wrapper-' + addComment.text_signature + ' div.reply_to_para' ).show();
					}

					// if we're cancelling, show all reply to links
					if ( mode == 'cancel' && cp_promote_reading == '1' ) {
						jQuery( 'div.reply_to_para' ).show();
					} else {
						jQuery( '#para_wrapper-' + textSig + ' div.reply_to_para' ).hide();
					}

				}

			} else {

				// it's a comment on a paragraph
				var reply_text = jQuery( '#para_wrapper-' + textSig + ' a.reply_to_para' );
				//console.log( 'TITLE' );
				//console.log( reply_text );

				/*
				// test for multiples
				if ( reply_text.length > 1 ) {
					reply_text = jQuery( reply_text[0] );
				}
				*/

				//title.innerHTML = 'Comment on this paragraph';
				title.innerHTML = reply_text.text();

				// get comment list
				var comment_list = jQuery( '#para_wrapper-' + addComment.text_signature + ' .commentlist' );

				// if we have a comment list and promoting commenting (or promoting reading)...
				if ( ( comment_list[0] && cp_promote_reading == '0' ) || cp_promote_reading == '1' ) {

					// show previous reply to para link
					if ( 'undefined' !== typeof addComment.text_signature ) {
						jQuery( '#para_wrapper-' + addComment.text_signature + ' div.reply_to_para' ).show();
					}

				}

				// sort out reply to para links
				if ( cp_promote_reading == '0' ) {
					jQuery( '#para_wrapper-' + textSig + ' div.reply_to_para' ).hide();
				} else {
					// if we're cancelling, show all reply to links
					if ( mode == 'cancel' ) {
						jQuery( 'div.reply_to_para' ).show();
					} else {
						jQuery( '#para_wrapper-' + textSig + ' div.reply_to_para' ).toggle();
					}
				}

			}

		} else {

			// it's a reply to another comment

			// store
			//addComment.replyTitle = title.innerHTML;
			//console.log( jQuery( '#comment-' + parentID + ' > .reply' ) );
			//console.log( jQuery( '#comment-' + parentID + ' > .reply' ).text() );

			// seems like sometimes we can get an array for the .reply with more than one item...
			var reply = jQuery( '#comment-' + parentID + ' > .reply' )[0];

			// get unique
			var unique = jQuery(reply).text();

			// if we have link text, then a comment reply is allowed...
			if ( unique != '' ) {

				// get reply link text
				title.innerHTML = unique;

				// sanitise textSig
				if ( 'undefined' === typeof textSig || textSig == '' ) { textSig == ''; }

				// if promoting commenting, sort out reply to para links
				if ( cp_promote_reading == '1' ) {

					// show previous
					if ( 'undefined' !== typeof addComment.text_signature ) {
						jQuery( '#para_wrapper-' + addComment.text_signature + ' div.reply_to_para' ).show();
					}

					// show current
					jQuery( '#para_wrapper-' + textSig + ' div.reply_to_para' ).show();

				}

			}

		}

	},



	/**
	 * Highlight a comment
	 *
	 * @param parentID The enclosing list item's CSS ID
	 * @return void
	 */
	highlightComment : function( parentID ) {

		// hide this reply link
		if ( parentID != '0' ) {
			jQuery( '#comment-' + parentID + ' > .reply' ).css('display', 'none');
		}

		// trigger theme to highlight comment
		jQuery( document ).trigger( 'commentpress-comment-highlight', [ parentID ] );

	},



	/**
	 * Clear a comment highlight
	 *
	 * @param parentID The enclosing list item's CSS ID
	 * @return void
	 */
	clearCommentHighlight : function( parentID ) {

		// show this reply link
		if ( parentID != '0' ) {

			// show reply link
			jQuery( '#comment-' + parentID + ' > .reply' ).css('display', 'block');

		}

		// unhighlight comment
		jQuery( document ).trigger( 'commentpress-comment-unhighlight', [ parentID ] );

	},



	/**
	 * Clear all comment highlights
	 *
	 * @return void
	 */
	clearAllCommentHighlights : function() {

		// show all reply links
		jQuery( '.reply' ).css('display', 'block');

		// clear highlight
		jQuery( document ).trigger( 'commentpress-comment-highlights-clear' );

	},



	/**
	 * Get stored text signature
	 *
	 * @return string text_signature The text signature
	 */
	getTextSig : function() {

		// --<
		return this.text_signature;

	},



	/**
	 * Find out if a comment is top level or not
	 *
	 * @return boolean True if comment is top level, false otherwise
	 */
	getLevel : function() {

		// is the comment on the paragraph?
		if ( 'undefined' === typeof this.parentID || this.parentID === '0' ) {

			return true;

		} else {

			return false;

		}

	}

}

