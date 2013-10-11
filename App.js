Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function() {
        MyApp = this;
        
        MyApp.storeCopies = [];
        MyApp.epicList = [];
        MyApp.currentScopePage = 1;
        MyApp.scopeDetails = [];
        MyApp.scopeDescription = [];
        MyApp.currentFeaturePage = 1;
        MyApp.featureDetails = [];
        MyApp.featureDescription = [];
        
        MyApp.globalContext = this.getContext().getDataContext();

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
        var thisIsMyStore = Ext.create('Rally.data.WsapiDataStore', {
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
                    console.log( myStore );
                    var index=0;
                    for (index=0; index<records.length; index++) {
                        MyApp.epicList.push( records[index].data.Name );
                    }
                    MyApp._drawComboBox();
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
        MyApp.storeCopies.push( myStore );

        // Remove the combo box
        MyApp.programPane.remove(MyApp.combo);

        title = records[0].data.Name;
        
        MyApp.programName = Ext.create('Ext.panel.Panel', {
            width: '100%',
            html: '<p><h1><a href=\'' + Rally.nav.Manager.getDetailUrl( records[0] ) + '\'>' + title + '</a></h1></p>',
            renderTo: Ext.getBody()
        });

        MyApp.programPane.add( MyApp.programName );

        MyApp.programDetails = Ext.create('Rally.ui.grid.Grid', {
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

        MyApp.programPane.add(MyApp.programDetails);

        MyApp.programDescription = Ext.create('Ext.panel.Panel', {
            width: '100%',
            html: '<p>' + records[0].data.Description + '</p>',
            renderTo: Ext.getBody()
        });
        
        MyApp.programPane.add( MyApp.programDescription );
        
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

        MyApp._loadScopeDetails();
    },
    
    _loadScopeDetails: function() {    
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
                    MyApp.storeCopies.push( myStore );

                    MyApp._buildScopeDetails( myStore, records );
                    
                    // Load the next until all pages are loaded
                    if ( myStore.currentPage < myStore.totalCount )
                    {
                        ++MyApp.currentScopePage;
                        MyApp._loadScopeDetails();
                    }
                    else
                    {
                        var index = 0;
                        for (index=0; index< myStore.totalCount; index++ ){
                            MyApp.scopePane.add(MyApp.scopeDetails[index]);
                            MyApp.scopePane.add(MyApp.scopeDescription[index] );
                        }

                        MyApp.featurePane = Ext.create('Ext.container.Container', {
                            componentCls: 'inner'
                        });
                        MyApp.add(MyApp._wrapComponent(MyApp.featurePane, 'feature'));
                
                        MyApp.featureTotal = Ext.create('Ext.panel.Panel', {
                            width: '100%',
                            html: '<p><h2>Feature Summary by PSI</h2></p>',
                            renderTo: Ext.getBody()
                        });
                
                        MyApp.featurePane.add( MyApp.featureTotal );

                        // Move to features
                        MyApp._loadFeatureDetails();
                    }
                }
            }
        });
        
        thisStore.loadPage( MyApp.currentScopePage );
    },
    
    _buildScopeDetails: function(myStore, records) {
        // Filter off the epic from the scope title
        var epicTitle = MyApp.selectedEpicName + ': ';
        var title = records[0].data.Name;
        if ( 0 === title.indexOf( epicTitle ) ) {
            title = title.substr( epicTitle.length );
        }

        MyApp.scopeDetails.push( Ext.create('Rally.ui.grid.Grid', {
            store: myStore,
            title: '<a href=\'' + Rally.nav.Manager.getDetailUrl( records[0] ) + '\'>' + title + '</a>',
            border: 1,
            columnCfgs: [
                'Name',
                {dataIndex: 'c_SAPProjectNumber', text:'SAP #'},
                'InvestmentCategory',
                'PlannedStartDate',
                'PlannedEndDate',
                'LastUpdateDate',
                'Project'
            ],
            showPagingToolbar: false            
        }) );
        
        MyApp.scopeDescription.push( Ext.create('Ext.panel.Panel', {
            width: '100%',
            html: '<p>' + records[0].data.Description + '</p>',
            renderTo: Ext.getBody()
        }) );
    },

    _loadFeatureDetails: function() {    
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
                property: 'Release',
                direction: 'ASC'
            },
            
            listeners: {
                load: function( myStore, records ) {
                    MyApp.storeCopies.push( myStore );

                    MyApp._writeFeatureDetails( myStore, records );
                    
                    // Load the next until all pages are loaded
                    if ( myStore.currentPage < myStore.totalCount )
                    {
                        ++MyApp.currentFeaturePage;
                        MyApp._loadFeatureDetails();
                    }
                    else
                    {
                        var index = 0;
                        for (index=0; index< myStore.totalCount; index++ ){
                            MyApp.featurePane.add(MyApp.featureDetails[index]);
                            MyApp.featurePane.add(MyApp.featureDescription[index] );
                        }
                        
                        for (index=0; index< MyApp.storeCopies.length; index++){
                            console.log( MyApp.storeCopies[index] );
                        }
                    }
                }
            }
        });

        thisStore.loadPage( MyApp.currentFeaturePage );
    },
    
    _writeFeatureDetails: function(myStore, records) {
        var title = records[0].data.Name;

        MyApp.featureDetails.push( Ext.create('Rally.ui.grid.Grid', {
            store: myStore,
            border: 1,
            title: '<a href=\'' + Rally.nav.Manager.getDetailUrl( records[0] ) + '\'>' + title + '</a>',
            columnCfgs: [
                'Name',
                'PreliminaryEstimate',
                'ValueScore',
                'RiskScore',
                'Project',
                'LastUpdateDate',
                'Release'
            ],
            showPagingToolbar: false            
        }));
        
        MyApp.featureDescription.push( Ext.create('Ext.panel.Panel', {
            width: '100%',
            html: '<p>' + records[0].data.Description + '</p>',
            renderTo: Ext.getBody()
        }));
    }    
});
