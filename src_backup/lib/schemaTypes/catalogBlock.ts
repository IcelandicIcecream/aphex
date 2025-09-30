import type { SchemaType } from "$lib/cms/types";

export const catalogBlock: SchemaType = {
  type: 'object',
  name: 'catalogBlock',
  title: 'Catalog Block',
  description: 'A content block that displays a catalog',
  fields: [
    {
      name: 'title',
      type: 'string',
      title: 'Block Title',
      description: 'Optional title for this catalog section'
    },
    {
      name: 'catalogReference',
      type: 'reference',
      title: 'Select Catalog',
      description: 'Choose which catalog to display',
      to: [{ type: 'catalog' }],
      validation: Rule => Rule.required()
    },
    {
      name: 'displayOptions',
      type: 'object',
      title: 'Display Options',
      fields: [
        {
          name: 'showPrices',
          type: 'boolean',
          title: 'Show Prices',
          description: 'Whether to display item prices',
          initialValue: true
        },
        {
          name: 'layout',
          type: 'string',
          title: 'Layout Style',
          description: 'How to display the catalog items',
          validation: Rule => Rule.oneOf(['grid', 'list', 'cards'])
        }
      ]
    }
  ]
};

export default catalogBlock;