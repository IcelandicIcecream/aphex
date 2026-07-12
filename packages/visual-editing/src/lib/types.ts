// Messages sent from the frontend iframe → CMS parent
export type AphexOutboundMessage =
	| { type: 'aphex:ready'; stega: boolean }
	| {
			type: 'aphex:field-click';
			fieldPath: string;
			blockIndex?: number;
			blockKey?: string;
			arrayIndex?: number;
			objectPath?: string;
			/** href of the clicked link, when the click landed on an anchor. */
			linkHref?: string;
			/** When set, the click targets a different document (app-level reference);
			 *  the studio opens it instead of resolving a field in the current doc. */
			documentId?: string;
			documentType?: string;
	  };

// Messages sent from the CMS parent → frontend iframe
export type AphexInboundMessage =
	| { type: 'aphex:field-focus'; fieldPath: string }
	| {
			type: 'aphex:data';
			document: Record<string, unknown>;
			documentType?: string;
			documentId?: string;
	  }
	| { type: 'aphex:edit-mode'; enabled: boolean }
	| { type: 'aphex:refresh' };
