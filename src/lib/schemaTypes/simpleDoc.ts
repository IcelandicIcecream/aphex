import type { SchemaType } from "@aphex/cms-core";

export const simpleDoc: SchemaType = {
  type: 'document',
  name: 'simple_document',
  title: 'Simple Document',
  description: 'Just a simple document',
  fields: [
    {
      name: 'title',
      type: 'string',
      title: 'Simple Title',
      description: 'The main title of the document',
      validation: Rule => Rule.required().max(10)
    },
    {
      name: 'description',
      type: 'string',
      title: 'Simple Description',
      description: 'The main description of the document',
      validation: Rule => Rule.required().max(20)
    }]
}

export default simpleDoc;
