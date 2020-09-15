import React, { useState } from 'react';
import { Button, Dropdown, Confirm } from 'semantic-ui-react';
import FileUploadModal from '../modals/file-upload-modal';
import FolderUploadModal from '../modals/folder-upload-modal';
import SchemaStructureModal from '../modals/schema-structure-modal';
import { deleteObject } from '../utils/amazon-s3-utils';

/**
 * This component controls how much info you want to load in from the api
 */
const BucketSettings = ({
  pathChange,
  updateList,
  bucket,
  pathInfo,
  schemaInfo
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const deleteCurrentFolder = () => {
    if (pathInfo.depth >= 1) {
      let pathValues = pathInfo.path.split('/');

      deleteObject(bucket, pathInfo.path).then(() => {
        pathChange({
          path: `${pathInfo.path.split('/', pathInfo.depth - 1)}/`,
          depth: pathValues.depth
        });
        updateList();
      });
    }
  };

  const showConfirmDelete = () => {
    setShowConfirm(true);
  };

  const closeConfirmDelete = () => {
    setShowConfirm(false);
  };

  return (
    <div className="bucket-bar">
      <span className="bucket-buttons">
        <Dropdown button text="File">
          <Dropdown.Menu>
            <FileUploadModal
              updateList={updateList}
              bucket={bucket}
              schemaInfo={schemaInfo}
              pathInfo={pathInfo}
              trigger={<Dropdown.Item text="New File" />}
            />
            <FolderUploadModal
              updateList={updateList}
              bucket={bucket}
              pathInfo={pathInfo}
              trigger={<Dropdown.Item text="New Folder" />}
            />
            <Dropdown.Divider />
            <SchemaStructureModal
              updateList={updateList}
              schemaInfo={schemaInfo}
              bucket={bucket}
              pathInfo={pathInfo}
              trigger={<Dropdown.Item text="Folder Schema" />}
            />
          </Dropdown.Menu>
        </Dropdown>
        <FolderUploadModal
          updateList={updateList}
          bucket={bucket}
          pathInfo={pathInfo}
          trigger={<Button size="medium">New Folder</Button>}
        />
        <FileUploadModal
          updateList={updateList}
          bucket={bucket}
          schemaInfo={schemaInfo}
          pathInfo={pathInfo}
          trigger={<Button size="medium">Upload</Button>}
        />
        <SchemaStructureModal
          updateList={updateList}
          schemaInfo={schemaInfo}
          bucket={bucket}
          pathInfo={pathInfo}
          trigger={<Button size="medium">Tags in folder Schema</Button>}
        />
      </span>
      <span className="bucket-buttons-right">
        {pathInfo.depth >= 1 ? (
          <>
            <Button size="medium" color="red" onClick={showConfirmDelete}>
              Delete Current Folder
            </Button>
            <Confirm
              open={showConfirm}
              cancelButton="Cancel"
              confirmButton="Delete"
              onCancel={closeConfirmDelete}
              onConfirm={deleteCurrentFolder}
            />
          </>
        ) : (
          ''
        )}
      </span>
    </div>
  );
};
export default BucketSettings;
