import type { SchemaType } from "$lib/cms/types";

export const callToAction: SchemaType = {
  type: 'object',
  name: 'callToAction',
  title: 'Call to Action',
  description: 'A call-to-action section with title, description, and button',
  fields: [
    {
      name: 'title',
      type: 'string',
      title: 'CTA Title',
      description: 'Main heading for the call-to-action',
      validation: Rule => Rule.required().max(80)
    },
    {
      name: 'description',
      type: 'text',
      title: 'CTA Description',
      description: 'Supporting text for the call-to-action',
      rows: 3
    },
    {
      name: 'buttonText',
      type: 'string',
      title: 'Button Text',
      description: 'Text displayed on the button',
      validation: Rule => Rule.required().max(30)
    },
    {
      name: 'buttonUrl',
      type: 'string',
      title: 'Button URL',
      description: 'Where the button should link to',
      validation: Rule => Rule.required()
    }
  ]
};

export default callToAction;
