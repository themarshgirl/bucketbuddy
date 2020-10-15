import React, { useState, useEffect } from 'react';
import BucketPath from '../BucketPath';
import BucketSettings from '../BucketSettings';
import FileContainer from '../FileContainer';
import { Dimmer, Loader, Transition } from 'semantic-ui-react';
import {
  listObjects,
  getFolderSchema,
  getObjectTags
} from '../../utils/amazon-s3-utils';
import FolderMenu from '../FolderMenu';
import NavMenu from '../NavMenu';
import { updateCacheFiles } from '../../utils/cache-utils';
import './bucketviewer.scss';

export const schemaFileName = 'bucket-buddy-schema.json';

const BucketViewer = (props) => {
  const [bucket] = useState(props.location.state.bucket);
  const [pathInfo, setPathInfo] = useState(null);
  const [files, setFiles] = useState({ folders: [], files: [] });
  const [visibleFiles, setVisibleFiles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fileSearchText, setFileSearchText] = useState('');
  const [chosenTag, setChosenTag] = useState('');
  const [tagSearchText, setTagSearchText] = useState('');
  const [transitions, setTransitions] = useState(['fly right', 'fly left']);
  const [filesLoading, setFilesLoading] = useState(true);
  const [schemaInfo, setSchemaInfo] = useState({
    available: false,
    tagset: []
  });
  const [settings, setSettings] = useState({
    cacheImages: localStorage.cacheImages
  });

  //This checks the url and tries to navigate to the folders directly if refreshed
  if (!pathInfo) {
    const urlPathInfo = props.location.pathname.split('/');
    if (urlPathInfo.length === 2) {
      setPathInfo({
        path: '',
        depth: 0
      });
    } else {
      let urlInfo = urlPathInfo.slice(urlPathInfo.indexOf(bucket.name) + 1);
      setPathInfo({
        path: urlInfo.join('/'),
        depth: urlInfo.length - 1
      });
    }
  }

  useEffect(() => {
    if (bucket && loading) {
      updateList();
      setLoading(false);
    }
  });

  useEffect(() => {
    localStorage.cacheImages = settings.cacheImages;
  }, [settings]);

  useEffect(() => {
    if (!loading) {
      updateList();
    }
  }, [pathInfo]);

  useEffect(() => {
    setFilesLoading(false);
  }, [visibleFiles]);

  useEffect(() => {
    if (
      files.files.some(
        ({ Key }) => Key.split('/')[pathInfo.depth] === schemaFileName
      )
    ) {
      getFolderSchema(bucket, pathInfo.path).then((response) => {
        setSchemaInfo({ available: true, tagset: response });
      });
    } else {
      setSchemaInfo({ available: false, tagset: [] });
    }
  }, [files]);

  const updatePath = (newPath) => {
    if (newPath.depth > pathInfo.depth) {
      setTransitions(['fly right', 'fly left']);
    } else {
      setTransitions(['fly left', 'fly right']);
    }
    const { history } = props;

    setPathInfo(newPath);
    history.replace(
      {
        pathname: `/bucket-viewer/${bucket.name}/${newPath.path}`
      },
      {
        bucket: bucket
      }
    );
  };

  const updateList = () => {
    setFilesLoading(true);
    listObjects(bucket, pathInfo.path).then((data) => {
      filterList(data);
    });
  };

  /**
   * Takes a list of files and attaches it each individual file
   *
   * @param {S3.GetObjectOutput[]} files
   */
  const getAllTags = (files) => {
    return Promise.all(
      files.map(async function (file) {
        return await getObjectTags(bucket, file.Key).then((TagSet) => ({
          ...file,
          TagSet: TagSet.TagSet.map(({ Key, Value }) => ({
            key: Key,
            value: Value
          }))
        }));
      })
    );
  };

  const sortObjectsAlphabetically = (objects) => {
    objects.sort(function (fileOne, fileTwo) {
      return fileOne.Key.toLowerCase() < fileTwo.Key.toLowerCase()
        ? -1
        : fileOne.Key.toLowerCase() > fileTwo.Key.toLowerCase()
        ? 1
        : 0;
    });
  };

  /**
   * Filters the response into files and folders and adds the tag
   * information as well as the sources for the images
   *
   * @param {AWS.S3.ListObjectsV2Output} response
   */
  const filterList = async (response) => {
    const filetest = new RegExp(
      `^${pathInfo.path}([\\w!\\-\\.\\*'\\(\\),]+[/]?)$`
    );
    let newFiles = [];
    const newFolders = [];
    response.Contents.forEach((file) => {
      const filename = filetest.exec(file.Key);
      if (filename && filename[1]) {
        file.filename = filename[1];
        if (filename[1][filename[1].length - 1] === '/') {
          newFolders.push(file);
        } else {
          newFiles.push(file);
        }
      }
    });

    newFiles = await getAllTags(newFiles);
    const cachedSrcData = await updateCacheFiles(
      newFiles,
      `bucbud${bucket.name}`,
      pathInfo
    );
    newFiles = newFiles.map((value) => ({
      ...value,
      ...cachedSrcData.cachedKeys.find((val) => val.cacheKey === value.Key)
    }));

    sortObjectsAlphabetically(newFiles);
    sortObjectsAlphabetically(newFolders);
    const currentFiles = {
      folders: newFolders,
      files: newFiles
    };
    if (visibleFiles) {
      setVisibleFiles(currentFiles);
    } else {
      setVisibleFiles(currentFiles);
      setFiles(currentFiles);
    }
  };

  const updateTagState = (key, tagset) => {
    const fileIndex = visibleFiles.files.findIndex((file) => file.Key === key);
    const updatedFile = {
      ...visibleFiles.files[fileIndex],
      TagSet: tagset
    };
    const filesCopy = [...visibleFiles.files];
    filesCopy[fileIndex] = updatedFile;
    setVisibleFiles({
      folders: visibleFiles.folders,
      files: filesCopy
    });
  };

  const transition = () => {
    visibleFiles ? setFiles(visibleFiles) : setVisibleFiles(null);
  };

  if (loading) {
    return (
      <Dimmer>
        <Loader indeterminate>Preparing Files</Loader>
      </Dimmer>
    );
  } else {
    return (
      <div className="bucket-viewer">
        <div className="bucket-info">
          <NavMenu />
          <BucketPath
            bucket={bucket}
            pathInfo={pathInfo}
            schemaInfo={schemaInfo}
            pathChange={updatePath}
            updateList={updateList}
            search={{
              text: tagSearchText,
              setSearchText: setTagSearchText,
              chosenTag: chosenTag,
              setChosenTag: setChosenTag
            }}
          />
          <BucketSettings
            bucket={bucket}
            pathInfo={pathInfo}
            settings={settings}
            schemaInfo={schemaInfo}
            updateList={updateList}
            setSettings={setSettings}
            pathChange={updatePath}
          />
        </div>
        <div className="files-folders">
          <FolderMenu
            bucket={bucket}
            isLoading={filesLoading}
            folders={files.folders}
            updateList={updateList}
            pathInfo={pathInfo}
            customClickEvent={updatePath}
            search={{ text: fileSearchText, setSearchText: setFileSearchText }}
          />
          <div style={{ width: '100%' }}>
            <Transition
              visible={!filesLoading}
              onStart={() => transition()}
              onComplete={() => transitions.reverse()}
              onShow={() => {
                if (!filesLoading && files !== visibleFiles) {
                  setFiles(visibleFiles);
                }
              }}
              animation={transitions[0]}
              duration={250}
            >
              <span>
                {files.folders.length === 0 &&
                files.files.length === 0 &&
                filesLoading ? (
                  <Dimmer active>
                    <Loader indeterminate>Preparing Files</Loader>
                  </Dimmer>
                ) : (
                  <FileContainer
                    card
                    updateList={updateList}
                    isLoading={filesLoading}
                    bucket={bucket}
                    files={
                      visibleFiles &&
                      visibleFiles.files.filter((file) => {
                        if (chosenTag == '') {
                          return tagSearchText === '';
                        } else {
                          //This filter checks if there are any files with the tag that is used to search
                          const tagFile = file.TagSet.filter(
                            (x) => x['key'] === chosenTag
                          );
                          //If a file has the Tag chosen for searching. If length doesn't exist or is 0 it will be false
                          if (tagFile.length) {
                            //If no tag search text has been written just show all files with tag chosen
                            if (tagSearchText === '') {
                              return true;
                            } else {
                              return (
                                tagFile[0]['value']
                                  .toLowerCase()
                                  .search(tagSearchText.toLowerCase()) !== -1
                              );
                            }
                          } else {
                            return false;
                          }
                        }
                      })
                    }
                    updateTagState={updateTagState}
                    schemaInfo={schemaInfo}
                    settings={settings}
                    pathChange={updatePath}
                  />
                )}
              </span>
            </Transition>
          </div>
        </div>
      </div>
    );
  }
};
export default BucketViewer;
