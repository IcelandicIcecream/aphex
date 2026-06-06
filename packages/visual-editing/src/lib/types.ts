// Messages sent from the frontend iframe → CMS parent
export type AphexOutboundMessage =
	| { type: 'aphex:ready' }
	| { type: 'aphex:field-click'; fieldPath: string; documentId?: string };

// Messages sent from the CMS parent → frontend iframe
export type AphexInboundMessage =
	| { type: 'aphex:field-focus'; fieldPath: string }
	| { type: 'aphex:refresh' };
