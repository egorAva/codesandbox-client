import * as React from 'react';
import Loadable from 'react-loadable';
import Loading from 'app/components/Loading';
import Title from 'app/components/Title';
import SubTitle from 'app/components/SubTitle';
import getUI from 'common/templates/configuration/ui';
import Centered from 'common/components/flex/Centered';
import Margin from 'common/components/spacing/Margin';
import isImage from 'common/utils/is-image';
import getDefinition from 'common/templates';
import { getModulePath } from 'common/sandbox/modules';
import Tooltip from 'common/components/Tooltip';
import UIIcon from 'react-icons/lib/md/dvr';
import QuestionIcon from 'react-icons/lib/go/question';
import Monaco from './Monaco';
import ImageViewer from './ImageViewer';
import Configuration from './Configuration';
import { Icons, Icon } from './elements';
import { Settings } from 'app/store/modules/preferences/types';
import { Sandbox, Module } from 'app/store/modules/editor/types';

const CodeMirror = Loadable({
    loader: () => import(/* webpackChunkName: 'codemirror-editor' */ './CodeMirror'),
    LoadingComponent: Loading
});

const getDependencies = (sandbox) => {
    const packageJSON = sandbox.modules.find((m) => m.title === 'package.json' && m.directoryShortid == null);

    if (packageJSON != null) {
        try {
            const { dependencies = {}, devDependencies = {} } = JSON.parse(packageJSON.code || '');

            const usedDevDependencies = {};
            Object.keys(devDependencies).forEach((d) => {
                if (d.startsWith('@types')) {
                    usedDevDependencies[d] = devDependencies[d];
                }
            });

            return { ...dependencies, ...usedDevDependencies };
        } catch (e) {
            // tslint:disable-next-line
            console.error(e);
            return null;
        }
    } else {
        return typeof sandbox.npmDependencies.toJS === 'function'
            ? sandbox.npmDependencies.toJS()
            : sandbox.npmDependencies;
    }
};

export type Props = {
    settings: Partial<Settings>;
    currentModule: Module;
    sandbox: Sandbox;
    readOnly?: boolean;
    highlightedLines?: number[];
    isLive?: boolean;
    onlyViewMode?: boolean;
    hideNavigation?: boolean;
    width?: number | string;
    height?: number | string;
    onInitialized?: (component: React.Component) => () => void;
    onChange?: (code: string) => void;
    onSave?: (code: string) => void;
    onModuleChange?: (moduleId: string) => void;
    onNpmDependencyAdded?: (name: string) => void;
    sendTransforms?: (operations: any) => void;
    onCodeReceived: () => void;
    onSelectionChanged: () => void;
    tsconfig: any;
};

type State = {
    showConfigUI: boolean;
};

export default class CodeEditor extends React.PureComponent<Props, State> {
    state: State = {
        showConfigUI: true
    };

    toggleConfigUI = () => {
        this.setState({ showConfigUI: !this.state.showConfigUI });
    };

    render() {
        const props = this.props;

        const settings = props.settings;
        const module = props.currentModule;
        const sandbox = props.sandbox;
        const dependencies = getDependencies(sandbox);

        const template = getDefinition(sandbox.template);
        const modulePath = getModulePath(sandbox.modules, sandbox.directories, module.id);
        const config = template.configurationFiles[modulePath];
        if (config && getUI(config.type) && this.state.showConfigUI) {
            return <Configuration {...props} config={config} toggleConfigUI={this.toggleConfigUI} />;
        }

        if (module.isBinary) {
            if (isImage(module.title)) {
                return <ImageViewer {...props} dependencies={dependencies} />;
            }

            return (
                <Margin
                    style={{
                        overflow: 'auto',
                        height: props.height || '100%',
                        width: props.width || '100%'
                    }}
                    top={2}
                >
                    <Centered horizontal vertical>
                        <Title>This file is too big to edit</Title>
                        <SubTitle>We will add support for this as soon as possible.</SubTitle>

                        <a href={module.code} target="_blank" rel="noreferrer noopener">
                            Open file externally
                        </a>
                    </Centered>
                </Margin>
            );
        }

        const Editor = (settings.vimMode || settings.codeMirror) && !props.isLive ? CodeMirror : Monaco;

        return (
            <div
                style={{
                    height: props.height || '100%',
                    width: props.width || '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0
                }}
            >
                {config &&
                    (getUI(config.type) ? (
                        <Icons>
                            <Tooltip title="Switch to UI Configuration">
                                <Icon onClick={this.toggleConfigUI}>
                                    <UIIcon />
                                </Icon>
                            </Tooltip>
                        </Icons>
                    ) : (
                        <Icons style={{ fontSize: '.875rem' }}>
                            {config.partialSupportDisclaimer ? (
                                <Tooltip
                                    position="bottom"
                                    title={config.partialSupportDisclaimer}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    Partially Supported Config <QuestionIcon style={{ marginLeft: '.5rem' }} />
                                </Tooltip>
                            ) : (
                                <div>Supported Configuration</div>
                            )}
                        </Icons>
                    ))}
                <Editor {...props} dependencies={dependencies} />
            </div>
        );
    }
}