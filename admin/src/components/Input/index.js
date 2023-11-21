import React, { useState, useEffect, Fragment } from 'react';
import { useIntl } from 'react-intl';
import { useFetchClient, useCMEditViewDataManager } from '@strapi/helper-plugin';
import {
  SingleSelect,
  SingleSelectOption,
  Typography
} from '@strapi/design-system';

export default function Index({
  description,
  disabled,
  error,
  intlLabel,
  name,
  onChange,
  placeholder,
  required,
  value,
  attribute
}) {
  const { modifiedData, initialData } = useCMEditViewDataManager ();

  const [data, setData] = useState();
  const [tree, setTree] = useState();
  const [categories, setCategories] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [path, setPath] = useState(initialData.path);
  const [categoryId, setCategoryId] = useState();
  const [displayPath, setDisplayPath] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(0);
  const { formatMessage } = useIntl();
  const [err, setErr] = useState('');
  const { get } = useFetchClient();

  useEffect(() => {
    init();
    getCategories()
  }, []);

  useEffect(() => {
    update();
  }, [breadcrumbs, path, modifiedData])

  const depthMap = {
    "5" : <Fragment>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Fragment>,
    "4" : <Fragment>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Fragment>,
    "3" : <Fragment>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Fragment>,
    "2" : <Fragment>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Fragment>,
    "1" : <Fragment>&nbsp;&nbsp;&nbsp;&nbsp;</Fragment>,
  }

  function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
	}

  const init = async () => {
    if (initialData.path && isJson(initialData.path)) {
      setDisplayPath(JSON.parse(initialData.path).path);
      setSelectedCategoryId(JSON.parse(initialData.path).categoryId);
    }
  }

  const update = async () => {
    if (modifiedData.path && isJson(modifiedData.path)) {
      setDisplayPath(JSON.parse(modifiedData.path).path);
      setSelectedCategoryId(JSON.parse(modifiedData.path).categoryId);
    }
  }

  // Lets create a tree of our categories
  // Reference: https://typeofnan.dev/an-easy-way-to-build-a-tree-with-object-references/
  const buildTreeStructure = async (data) => {
    const idMapping = data.reduce((acc, el, i) => {
      acc[el.id] = i;
      return acc;
    }, {});

    let root = [];
    let counter = 0;

    data.forEach((el) => {
      // Handle the root element
      if (el.parent === null) {
        el.fullPath = el.slug;
        el.depthIndicator = 0;
        root[counter] = el;
        counter++;
        return; 
      }

      // Use our mapping to locate the parent element in our data array
      const parentEl = data[idMapping[el.parent.id]];

      // Add our current el to its parent's `children` array
      if (parentEl.fullPath) {
        el.depthIndicator = parentEl.depthIndicator + 1;
        el.fullPath = parentEl.fullPath + "/" + el.slug;
      } else {
        el.fullPath = parentEl.slug + "/" + el.slug;
      }
        
      parentEl.children = [...(parentEl.children || []), el];
    });

    setTree(root);

    return root;
  }

  // Build the structure for selecting category
  const buildSelectStructure = async (selectstructure, tree) => {
    tree.map((branch) => {      
      selectstructure.push({
        "name": branch.name, 
        "slug": branch.slug, 
        "fullPath": branch.fullPath, 
        "categoryId": branch.id, 
        "depth": branch.depthIndicator
      });
      if (Array.isArray(branch.children)) {
        buildSelectStructure(selectstructure, branch.children);
      }
    });
  }

  // Get categories
  const getCategories = async () => {
    const { data } = await get('/paths/pathscategories');
    setData(data);
    const root = await buildTreeStructure(data);
    const selectstructure = [];
    await buildSelectStructure(selectstructure, root);
    setCategories(selectstructure);
  }

  // Generate breadcrumbs (selected category and all its parents)
  const generateBreadcrumbs = async (crumbs, categoryId) => {
    let currentCategory = data.filter((el) => el.id == categoryId)[0];
    crumbs.push({
      "name": currentCategory.name,
      "slug": currentCategory.fullPath
    });

    while (currentCategory.parent !== null) {
      let curEl = data.filter((el) => { return el.id === currentCategory.parent.id });
      crumbs.push({
        "name": curEl[0].name,
        "slug": curEl[0].fullPath
      });
      currentCategory = curEl[0];
    }

    crumbs.reverse();
  }
  
  // Select category
  const selectCategory = async (value) => {
    const crumbs = [];
    await generateBreadcrumbs(crumbs, value);
    setBreadcrumbs(crumbs);
    
    const path = crumbs[crumbs.length - 1].slug;
    
    const obj = {
      "categoryId": value,
      "path": path + "/" + modifiedData.slug,
      "breadcrumbs": crumbs
    }
    setPath(JSON.stringify(obj));
    onChange({ target: { name, value: JSON.stringify(obj), type: attribute.type } })
  }

  const categoryList = categories.map(element => 
    <SingleSelectOption value={element.categoryId} selected={element.categoryId===value}>
      {depthMap[element.depth]} {element.name}
    </SingleSelectOption>
  );

  return (
  <>
    <SingleSelect label="Velg kategori" placeholder="Velg kategori..." name={ name }
      onChange={ selectCategory }
      onClear={() => { setCategoryId(undefined) }} 
      value={ selectedCategoryId }
      >
      {categoryList}
    </SingleSelect>
    <Typography>{ displayPath }</Typography>
  </>
  )
}
