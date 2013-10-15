Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function() {
        MyApp = this;
        
        MyApp.globalContext = this.getContext().getDataContext();

        MyApp.epicList = [];
        MyApp.psiList = [];

        MyApp.undefinedPSI = "Unscheduled";
        MyApp.psiList.push( MyApp.undefinedPSI );

        MyApp.featurePerPSI = [];

        // Load the program list and create the program combobox
        MyApp._loadProgramList();
    },
    
    _wrapComponent: function(component, cls) {
        var wrapper = Ext.create('Ext.container.Container', {
            componentCls: cls
        });
        
        wrapper.add(component);
        
        return wrapper;
    },
    
    _loadProgramList: function() {
        Ext.create('Rally.data.WsapiDataStore', {
            autoLoad: true,
                
            model: 'PortfolioItem/Epic',
            
            context: MyApp.globalContext,
            
            fetch: ['Name' ],
                
            sorters: {
                property: 'Name',
                direction: 'ASC'
            },
            
            listeners: {
                load: function( myStore, records ) {
                    //console.log( myStore );
                    var index=0;
                    for (index=0; index<records.length; index++) {
                        MyApp.epicList.push( records[index].data.Name );
                    }
                    MyApp._drawComboBox();
                    //MyApp.combo.setValue(MyApp.epicList[0]);
                }
            }
        });
    },
    
    _drawComboBox: function() {
        MyApp.combo = Ext.create('Ext.form.ComboBox', {
            fieldLabel: 'Program',

            store: MyApp.epicList,

            listeners: {
                'change': function(combo, newVal) {
                    MyApp.selectedEpicName = newVal;
                    
                    MyApp._loadProgramDetails();
                }
            }
        });

        MyApp.programPane = Ext.create('Ext.container.Container', {
            componentCls: 'inner'
        });

        MyApp.add(MyApp._wrapComponent(MyApp.programPane, 'program'));
        
        MyApp.programPane.add(MyApp.combo);
    },
    
    _loadProgramDetails: function() {    
        Ext.create('Rally.data.WsapiDataStore', {
            autoLoad: true,
                
            model: 'PortfolioItem/Epic',
            
            context: MyApp.globalContext,
            
            fetch: ['Name',
                    'c_SAPProjectNumber',
                    'InvestmentCategory',
                    'PlannedStartDate',
                    'PlannedEndDate',
                    'LastUpdateDate',
                    'Description'
                    ],
                
            filters: [
                    {
                        property: 'Name',
                        operator: 'Contains',
                        value: MyApp.selectedEpicName
                    }
                    ],
    
            sorters: {
                property: 'Rank',
                direction: 'ASC'
            },
            
            listeners: {
                load: MyApp._writeProgramDetails
            }
        });
    },
    
    _writeProgramDetails: function(myStore, records) {

        // Remove the combo box
        MyApp.programPane.remove(MyApp.combo);

        // Save the title
        title = records[0].data.Name;
        
        // Write the title panel
        MyApp.programName = Ext.create('Ext.panel.Panel', {
            width: '100%',
            html: '<p><h1><a href=\'' + Rally.nav.Manager.getDetailUrl( records[0] ) + '\' target=\'_top\'>' + title + '</a></h1></p>',
            renderTo: Ext.getBody()
        });

        MyApp.programPane.add( MyApp.programName );

        // Create the detail grid
        thisDetail = Ext.create('Rally.ui.grid.Grid', {
            store: myStore,
            border: 1,
            columnCfgs: [
                {dataIndex: 'c_SAPProjectNumber', text:'SAP #'},
                'InvestmentCategory',
                'PlannedStartDate',
                'PlannedEndDate',
                'LastUpdateDate'
            ],
            showPagingToolbar: false            
        });

        // Add the detail grid
        MyApp.programPane.add( thisDetail );

        // Create the description
        thisDescription = Ext.create('Ext.panel.Panel', {
            width: '100%',
            html: '<p>' + records[0].data.Description + '</p>',
            renderTo: Ext.getBody()
        });
        
        // Add the description
        MyApp.programPane.add( thisDescription );
        
        MyApp._loadScopeDetails( 1 );
    },
    
    _loadScopeDetails: function( currentPage ) {    
        thisStore = Ext.create('Rally.data.WsapiDataStore', {
            pageSize: 1,    // Load 1 page at a time
            limit: 1,       // Limit to 1
            
            model: 'PortfolioItem/MMF',
            context: MyApp.globalContext,

            fetch: ['Parent',
                    'Project',
                    'Name',
                    'c_SAPProjectNumber',
                    'InvestmentCategory',
                    'PlannedStartDate',
                    'PlannedEndDate',
                    'LastUpdateDate',
                    'Description'
                    ],
                
            filters: [
                    {
                        property: 'Parent.Name',
                        operator: 'Contains',
                        value: MyApp.selectedEpicName
                    }
                ],
    
            sorters: {
                property: 'Rank',
                direction: 'ASC'
            },
            
            listeners: {
                load: function( myStore, records ) {

                    // If there are items, then parse them
                    if ( myStore.totalCount > 0 ) {
                        // Create the scope panel only when there is scope defined
                        if ( 1 === myStore.currentPage ) {
                            // Create the scope panel
                            MyApp.scopePane = Ext.create('Ext.container.Container', {
                                componentCls: 'inner'
                            });
                            MyApp.add(MyApp._wrapComponent(MyApp.scopePane, 'scope'));
                    
                            MyApp.scopeTotal = Ext.create('Ext.panel.Panel', {
                                width: '100%',
                                html: '<p><h2>Scope Summary</h2></p>',
                                renderTo: Ext.getBody()
                            });
                    
                            MyApp.scopePane.add( MyApp.scopeTotal );
                        }
                        
                        MyApp._buildScopeDetails( myStore, records );
                        
                        // Load the next until all pages are loaded
                        if ( myStore.currentPage < myStore.totalCount )
                        {
                            MyApp._loadScopeDetails( myStore.currentPage+1 );
                        }
                        else
                        {
                            // Move to features
                            MyApp._loadFeatureDetails( 1 );
                        }
                    }
                }
            }
        });
        
        thisStore.loadPage( currentPage );
    },
    
    _buildScopeDetails: function(myStore, records) {
        // Filter off the epic from the scope title
        epicTitle = MyApp.selectedEpicName + ': ';
        title = records[0].data.Name;
        if ( 0 === title.indexOf( epicTitle ) ) {
            title = title.substr( epicTitle.length );
        }

        // Create the detail grid
        thisDetail = Ext.create('Rally.ui.grid.Grid', {
            store: myStore,
            title: '<a href=\'' + Rally.nav.Manager.getDetailUrl( records[0] ) + '\' target=\'_top\'>' + title + '</a>',
            border: 1,
            columnCfgs: [
                {dataIndex: 'c_SAPProjectNumber', text:'SAP #'},
                'InvestmentCategory',
                'PlannedStartDate',
                'PlannedEndDate',
                'LastUpdateDate',
                'Project'
            ],
            showPagingToolbar: false            
        });
        
        MyApp.scopePane.add( thisDetail );
        
        thisDescription = Ext.create('Ext.panel.Panel', {
            width: '100%',
            html: '<p>' + records[0].data.Description + '</p>',
            renderTo: Ext.getBody()
        });

        MyApp.scopePane.add( thisDescription );
    },

    _loadFeatureDetails: function( currentPage ) {    
        thisStore = Ext.create('Rally.data.WsapiDataStore', {
            pageSize: 1,    // Load 1 page at a time
            limit: 1,       // Limit to 1
            
            model: 'PortfolioItem/Feature',
            context: MyApp.globalContext,
            
            fetch: ['Parent',
                    'Project',
                    'Name',
                    'PreliminaryEstimate',
                    'ValueScore',
                    'RiskScore',
                    'LastUpdateDate',
                    'Description',
                    'Release'
                ],
                
            filters: [
                    {
                        property: 'Parent.Parent.Name',
                        operator: 'Contains',
                        value: MyApp.selectedEpicName
                    }
                ],

            sorters: {
                property: 'Rank',
                direction: 'ASC'
            },
            
            listeners: {
                load: function( myStore, records ) {

                    // If there are items, then parse them
                    if ( myStore.totalCount > 0 ) {
                        // Create the feature panel only when there is scope defined
                        if ( 1 === myStore.currentPage ) {
                            MyApp.featurePane = Ext.create('Ext.container.Container', {
                                componentCls: 'inner'
                            });
                            MyApp.add(MyApp._wrapComponent(MyApp.featurePane, 'feature'));
                    
                            MyApp.featureTotal = Ext.create('Ext.panel.Panel', {
                                width: '100%',
                                html: '<p><h2>Feature Summary</h2></p>',
                                renderTo: Ext.getBody()
                            });
                    
                            MyApp.featurePane.add( MyApp.featureTotal );
                        }
                        
                        MyApp._writeFeatureDetails( myStore, records );
                        
                        // Load the next until all pages are loaded
                        if ( myStore.currentPage < myStore.totalCount )
                        {
                            MyApp._loadFeatureDetails( myStore.currentPage+1 );
                        }
                        else {
                            MyApp._writePSIRoadmap();
                        }
                    }
                }
            }
        });

        thisStore.loadPage( currentPage );
    },
    
    _writeFeatureDetails: function(myStore, records) {
        var title = records[0].data.Name;
        var url = Rally.nav.Manager.getDetailUrl( records[0] );
        var release = records[0].data.Release;

        thisDetail = Ext.create('Rally.ui.grid.Grid', {
            store: myStore,
            border: 1,
            title: '<a href=\'' + url + '\' target=\'_top\'>' + title + '</a>',
            columnCfgs: [
                'PreliminaryEstimate',
                'ValueScore',
                'RiskScore',
                'Project',
                'LastUpdateDate',
                'Release'
            ],
            showPagingToolbar: false            
        });
        
        MyApp.featurePane.add( thisDetail );

        thisDescription = Ext.create('Ext.panel.Panel', {
            width: '100%',
            html: '<p>' + records[0].data.Description + '</p>',
            renderTo: Ext.getBody()
        });

        MyApp.featurePane.add( thisDescription );
        
        MyApp._updatePSIRoadmap( title, url, release );
    },
    
    _updatePSIRoadmap: function( featureName, url, release ) {

        // Look for the release name, assuming it is undefined to start
        releaseName = MyApp.undefinedPSI;
        if ( null !== release ) releaseName = release.Name;
        
        if ( MyApp._findIndex( releaseName, MyApp.psiList ) < 0 ) {
            MyApp.psiList.push( releaseName );
        }
        
        featureObjective = '<a href=\'' + url + '\' target=\'_top\'>' + featureName + '</a><br>';
        
        // Push the release and objective link to the list
        MyApp.featurePerPSI.push( { Release: releaseName, Feature: featureObjective } );
    },
    
    _writePSIRoadmap: function() {
        
        MyApp.roadmapPane = Ext.create('Ext.container.Container', {
            componentCls: 'inner'
        });
        MyApp.add(MyApp._wrapComponent(MyApp.roadmapPane, 'roadmap'));

        MyApp.featureRoadmap = Ext.create('Ext.panel.Panel', {
            width: '100%',
            html: '<p><h2>Feature Roadmap</h2></p>',
            renderTo: Ext.getBody()
        });

        MyApp.roadmapPane.add( MyApp.featureRoadmap );
        
        colWidth = ( parseFloat( MyApp.featureRoadmap.width ) / MyApp.psiList.length ) + '%';
        console.log( parseFloat(MyApp.featureRoadmap.width), colWidth );
        
        MyApp.psiList.sort();
        for ( var psiIndex=0; psiIndex<MyApp.psiList.length; psiIndex++ ) {
            var psiName = MyApp.psiList[psiIndex];

            insideHtml = '';

            // Loop through looking for matches
            for ( var index=0; index<MyApp.featurePerPSI.length; index++ ) {
                if ( MyApp.featurePerPSI[index].Release === psiName ) {
                    // Append to the inside HTML
                    insideHtml += MyApp.featurePerPSI[index].Feature;
                }
            }

            psiPanel  = Ext.create('Ext.panel.Panel', {
                title: '<p><h2>' + psiName + '</h2></p>',
                width: colWidth,
                html: insideHtml,
                renderTo: Ext.getBody(),
                componentCls: 'psi'
            });
            
            MyApp.roadmapPane.add( psiPanel );
            
        }
    },
    
	_findIndex: function (value, listOfValues) {
		var retVal = -1;

		for (var i = 0; i < listOfValues.length; i++) {
			if (listOfValues[i] == value) {
				retVal = i;
				break;
			}
		}
		return retVal;
	},
	
    _getPageWidth: function() {
        if (self.innerWidth) {
           return self.innerWidth;
        }
        else if (document.documentElement && document.documentElement.clientHeight){
            return document.documentElement.clientWidth;
        }
        else if (document.body) {
            return document.body.clientWidth;
        }
        return 0;
    }
});
