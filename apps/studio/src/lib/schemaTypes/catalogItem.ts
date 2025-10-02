import type { SchemaType } from "@aphex/cms-core";

export const catalogItem: SchemaType = {
  type: 'object',
  name: 'catalogItem',
  title: 'Catalog Item',
  description: 'An individual item in a catalog with title, description, and price',
  fields: [
    {
      name: 'title',
      type: 'string',
      title: 'Item Title',
      description: 'The name of the catalog item',
      validation: Rule => Rule.required().max(100)
    },
    {
      name: 'shortDescription',
      type: 'text',
      title: 'Short Description',
      description: 'Brief description of the item',
      rows: 3,
      validation: Rule => Rule.required().max(300)
    },
    {
      name: 'price',
      type: 'number',
      title: 'Price',
      description: 'Price of the item',
      validation: Rule => Rule.required().min(0)
    }
  ]
};

export default catalogItem;